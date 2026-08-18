package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/id"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 聚合 Resource 生命周期中不涉及外部内容修改的产品规则。
type ResourceService struct {
	db      *storage.DB
	fetcher *remote.Fetcher
}

// 保持资源规则与持久化实现解耦。
func NewResourceService(db *storage.DB, fetcher *remote.Fetcher) *ResourceService {
	return &ResourceService{
		db:      db,
		fetcher: fetcher,
	}
}

// 纳入文件时只确认入口可达性，不读取或接管内容。
func (s *ResourceService) AddFileResource(ctx context.Context, inputPath string) (*ResourceDTO, error) {
	cleanPath, err := normalize.FilePath(inputPath)
	if err != nil {
		return nil, fmt.Errorf("invalid file path: %w", err)
	}

	available := false
	if _, err := os.Stat(cleanPath); err == nil {
		available = true
	}

	defaultTitle := filepath.Base(cleanPath)
	if defaultTitle == "" || defaultTitle == "." || defaultTitle == "/" {
		defaultTitle = cleanPath
	}

	now := time.Now().UnixMilli()
	resID := id.NewID()
	sourceID := id.NewID()

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO resources (id, title, note, created_at, updated_at)
			VALUES (?, ?, '', ?, ?)
		`, resID, defaultTitle, now, now)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, `
			INSERT INTO sources (id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, 1, 0, '', ?, ?)
		`, sourceID, resID, storage.SourceTypeFile, cleanPath, boolToInt(available), now, now)
		return err
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create file resource: %w", err)
	}

	return s.GetResource(ctx, resID)
}

// URL 纳入以一次限时抓取建立初始展示上下文，失败也保留用户入口。
func (s *ResourceService) AddURLResource(ctx context.Context, inputURL string) (*ResourceDTO, error) {
	normURL, err := normalize.URL(inputURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	parsed, _ := url.Parse(normURL)
	defaultTitle := parsed.Hostname()

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	meta, available, _ := s.fetcher.FetchURL(fetchCtx, normURL)

	metadataJSON := ""
	if meta != nil {
		if meta.Title != "" {
			defaultTitle = meta.Title
		}
		bytes, err := json.Marshal(meta)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	now := time.Now().UnixMilli()
	resID := id.NewID()
	sourceID := id.NewID()

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO resources (id, title, note, created_at, updated_at)
			VALUES (?, ?, '', ?, ?)
		`, resID, defaultTitle, now, now)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, `
			INSERT INTO sources (id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
		`, sourceID, resID, storage.SourceTypeURL, normURL, boolToInt(available), metadataJSON, now, now)
		return err
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create URL resource: %w", err)
	}

	return s.GetResource(ctx, resID)
}

// 允许用户维护库内语义，不影响外部内容。
func (s *ResourceService) UpdateResourceTitle(ctx context.Context, resourceID string, newTitle string) (*ResourceDTO, error) {
	trimmed := strings.TrimSpace(newTitle)
	if trimmed == "" {
		return nil, errors.New("resource title cannot be empty")
	}

	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `
			UPDATE resources SET title = ?, updated_at = ? WHERE id = ?
		`, trimmed, now, resourceID)
		if err != nil {
			return err
		}
		rows, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errors.New("resource not found")
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.GetResource(ctx, resourceID)
}

// 仅保存简短个人上下文。
func (s *ResourceService) UpdateResourceNote(ctx context.Context, resourceID string, note string) (*ResourceDTO, error) {
	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `
			UPDATE resources SET note = ?, updated_at = ? WHERE id = ?
		`, note, now, resourceID)
		if err != nil {
			return err
		}
		rows, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errors.New("resource not found")
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.GetResource(ctx, resourceID)
}

// 从资源库移除记录，不触及任何外部内容。
func (s *ResourceService) DeleteResource(ctx context.Context, resourceID string) error {
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `DELETE FROM resources WHERE id = ?`, resourceID)
		if err != nil {
			return err
		}
		rows, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errors.New("resource not found")
		}
		return nil
	})
}

// 以稳定身份读取资源详情。
func (s *ResourceService) GetResource(ctx context.Context, resourceID string) (*ResourceDTO, error) {
	row := s.db.SqlDB().QueryRowContext(ctx, `
		SELECT id, title, note, created_at, updated_at
		FROM resources
		WHERE id = ?
	`, resourceID)

	var res ResourceDTO
	if err := row.Scan(&res.ID, &res.Title, &res.Note, &res.CreatedAt, &res.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("resource not found")
		}
		return nil, err
	}

	sources, err := s.fetchSources(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	res.Sources = sources
	for _, src := range sources {
		if src.IsPreferred {
			res.PreferredID = src.ID
			break
		}
	}

	tags, err := s.fetchTags(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	res.Tags = tags

	return &res, nil
}

// 以最近纳入优先的顺序支持资源库浏览。
func (s *ResourceService) ListResources(ctx context.Context) ([]ResourceDTO, error) {
	rows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT id, title, note, created_at, updated_at
		FROM resources
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ResourceDTO
	for rows.Next() {
		var res ResourceDTO
		if err := rows.Scan(&res.ID, &res.Title, &res.Note, &res.CreatedAt, &res.UpdatedAt); err != nil {
			return nil, err
		}
		sources, err := s.fetchSources(ctx, res.ID)
		if err != nil {
			return nil, err
		}
		res.Sources = sources
		for _, src := range sources {
			if src.IsPreferred {
				res.PreferredID = src.ID
				break
			}
		}

		tags, err := s.fetchTags(ctx, res.ID)
		if err != nil {
			return nil, err
		}
		res.Tags = tags
		result = append(result, res)
	}

	if result == nil {
		result = []ResourceDTO{}
	}
	return result, nil
}

// 仅搜索用户维护的上下文与来源基础信息，不扩展为内容索引。
func (s *ResourceService) SearchResources(ctx context.Context, query string) ([]ResourceDTO, error) {
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return s.ListResources(ctx)
	}

	likePattern := "%" + trimmed + "%"
	rows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT DISTINCT r.id, r.title, r.note, r.created_at, r.updated_at
		FROM resources r
		LEFT JOIN sources s ON s.resource_id = r.id
		LEFT JOIN taggings tg ON tg.resource_id = r.id
		LEFT JOIN tags t ON t.id = tg.tag_id
		WHERE r.title LIKE ?
		   OR r.note LIKE ?
		   OR t.name LIKE ?
		   OR s.location LIKE ?
		   OR s.metadata_json LIKE ?
		ORDER BY r.created_at DESC
	`, likePattern, likePattern, likePattern, likePattern, likePattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ResourceDTO
	for rows.Next() {
		var res ResourceDTO
		if err := rows.Scan(&res.ID, &res.Title, &res.Note, &res.CreatedAt, &res.UpdatedAt); err != nil {
			return nil, err
		}
		sources, err := s.fetchSources(ctx, res.ID)
		if err != nil {
			return nil, err
		}
		res.Sources = sources
		for _, src := range sources {
			if src.IsPreferred {
				res.PreferredID = src.ID
				break
			}
		}

		tags, err := s.fetchTags(ctx, res.ID)
		if err != nil {
			return nil, err
		}
		res.Tags = tags
		result = append(result, res)
	}

	if result == nil {
		result = []ResourceDTO{}
	}
	return result, nil
}

func (s *ResourceService) fetchSources(ctx context.Context, resourceID string) ([]SourceDTO, error) {
	rows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at
		FROM sources
		WHERE resource_id = ?
		ORDER BY order_index ASC
	`, resourceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sources []SourceDTO
	for rows.Next() {
		var src SourceDTO
		var availInt, prefInt int
		if err := rows.Scan(&src.ID, &src.ResourceID, &src.Type, &src.Location, &availInt, &prefInt, &src.OrderIndex, &src.MetadataJSON, &src.CreatedAt, &src.UpdatedAt); err != nil {
			return nil, err
		}
		src.Available = availInt != 0
		src.IsPreferred = prefInt != 0
		sources = append(sources, src)
	}
	if sources == nil {
		sources = []SourceDTO{}
	}
	return sources, nil
}

func (s *ResourceService) fetchTags(ctx context.Context, resourceID string) ([]TagDTO, error) {
	rows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT t.id, t.name, t.created_at
		FROM tags t
		INNER JOIN taggings tg ON tg.tag_id = t.id
		WHERE tg.resource_id = ?
		ORDER BY tg.created_at ASC
	`, resourceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []TagDTO
	for rows.Next() {
		var tag TagDTO
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	if tags == nil {
		tags = []TagDTO{}
	}
	return tags, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
