package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/id"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 维护 Resource 的外部入口，同时保证 Resource 始终可被保留。
type SourceService struct {
	db      *storage.DB
	fetcher *remote.Fetcher
}

// 保持 Source 规则与持久化实现解耦。
func NewSourceService(db *storage.DB, fetcher *remote.Fetcher) *SourceService {
	return &SourceService{
		db:      db,
		fetcher: fetcher,
	}
}

// 补充备用入口不应意外改变用户当前的首选入口。
func (s *SourceService) AddFileSource(ctx context.Context, resourceID string, inputPath string) (*SourceDTO, error) {
	cleanPath, err := normalize.FilePath(inputPath)
	if err != nil {
		return nil, fmt.Errorf("invalid file path: %w", err)
	}

	available := false
	if _, err := os.Stat(cleanPath); err == nil {
		available = true
	}

	now := time.Now().UnixMilli()
	sourceID := id.NewID()

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		var maxOrder int
		err := tx.QueryRowContext(ctx, `
			SELECT COALESCE(MAX(order_index), -1) FROM sources WHERE resource_id = ?
		`, resourceID).Scan(&maxOrder)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, `
			INSERT INTO sources (id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, 0, ?, '', ?, ?)
		`, sourceID, resourceID, storage.SourceTypeFile, cleanPath, boolToInt(available), maxOrder+1, now, now)
		return err
	})

	if err != nil {
		return nil, fmt.Errorf("failed to add file source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 补充 URL 入口不应覆盖用户已维护的资源语义。
func (s *SourceService) AddURLSource(ctx context.Context, resourceID string, inputURL string) (*SourceDTO, error) {
	normURL, err := normalize.URL(inputURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	meta, available, _ := s.fetcher.FetchURL(fetchCtx, normURL)

	metadataJSON := ""
	if meta != nil {
		bytes, err := json.Marshal(meta)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	now := time.Now().UnixMilli()
	sourceID := id.NewID()

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		var maxOrder int
		err := tx.QueryRowContext(ctx, `
			SELECT COALESCE(MAX(order_index), -1) FROM sources WHERE resource_id = ?
		`, resourceID).Scan(&maxOrder)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, `
			INSERT INTO sources (id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
		`, sourceID, resourceID, storage.SourceTypeURL, normURL, boolToInt(available), maxOrder+1, metadataJSON, now, now)
		return err
	})

	if err != nil {
		return nil, fmt.Errorf("failed to add URL source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 替换入口时保留其在 Resource 中的角色与顺位。
func (s *SourceService) ReplaceFileSource(ctx context.Context, sourceID string, inputPath string) (*SourceDTO, error) {
	cleanPath, err := normalize.FilePath(inputPath)
	if err != nil {
		return nil, fmt.Errorf("invalid file path: %w", err)
	}

	available := false
	if _, err := os.Stat(cleanPath); err == nil {
		available = true
	}

	now := time.Now().UnixMilli()
	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `
			UPDATE sources
			SET type = ?, location = ?, available = ?, metadata_json = '', updated_at = ?
			WHERE id = ?
		`, storage.SourceTypeFile, cleanPath, boolToInt(available), now, sourceID)
		if err != nil {
			return err
		}
		rows, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errors.New("source not found")
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to replace source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 替换入口时保留其在 Resource 中的角色与顺位。
func (s *SourceService) ReplaceURLSource(ctx context.Context, sourceID string, inputURL string) (*SourceDTO, error) {
	normURL, err := normalize.URL(inputURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	meta, available, _ := s.fetcher.FetchURL(fetchCtx, normURL)
	metadataJSON := ""
	if meta != nil {
		bytes, err := json.Marshal(meta)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	now := time.Now().UnixMilli()
	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `
			UPDATE sources
			SET type = ?, location = ?, available = ?, metadata_json = ?, updated_at = ?
			WHERE id = ?
		`, storage.SourceTypeURL, normURL, boolToInt(available), metadataJSON, now, sourceID)
		if err != nil {
			return err
		}
		rows, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errors.New("source not found")
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to replace source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 首选入口是用户的明确选择，不能出现多个候选。
func (s *SourceService) SetPreferredSource(ctx context.Context, resourceID string, sourceID string) error {
	now := time.Now().UnixMilli()
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 先清除旧选择，维持唯一首选的不变量。
		_, err := tx.ExecContext(ctx, `
			UPDATE sources SET is_preferred = 0, updated_at = ? WHERE resource_id = ?
		`, now, resourceID)
		if err != nil {
			return err
		}

		res, err := tx.ExecContext(ctx, `
			UPDATE sources SET is_preferred = 1, updated_at = ? WHERE id = ? AND resource_id = ?
		`, now, sourceID, resourceID)
		if err != nil {
			return err
		}
		rows, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errors.New("source not found on resource")
		}
		return nil
	})
}

// Resource 必须保留至少一个入口；失去首选入口时按既有顺位延续访问路径。
func (s *SourceService) RemoveSource(ctx context.Context, sourceID string) error {
	now := time.Now().UnixMilli()
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		var resourceID string
		var wasPreferred int
		err := tx.QueryRowContext(ctx, `
			SELECT resource_id, is_preferred FROM sources WHERE id = ?
		`, sourceID).Scan(&resourceID, &wasPreferred)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return errors.New("source not found")
			}
			return err
		}

		var count int
		err = tx.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM sources WHERE resource_id = ?
		`, resourceID).Scan(&count)
		if err != nil {
			return err
		}

		if count <= 1 {
			return errors.New("cannot remove the only source of a resource; delete the resource instead")
		}

		_, err = tx.ExecContext(ctx, `DELETE FROM sources WHERE id = ?`, sourceID)
		if err != nil {
			return err
		}

		if wasPreferred != 0 {
			// 以既有顺位恢复默认入口，避免引入新的猜测。
			var nextPreferredID string
			err = tx.QueryRowContext(ctx, `
				SELECT id FROM sources WHERE resource_id = ? ORDER BY order_index ASC LIMIT 1
			`, resourceID).Scan(&nextPreferredID)
			if err != nil {
				return err
			}

			_, err = tx.ExecContext(ctx, `
				UPDATE sources SET is_preferred = 1, updated_at = ? WHERE id = ?
			`, now, nextPreferredID)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

// 仅在用户明确请求时更新远程展示信息。
func (s *SourceService) RefreshURLSource(ctx context.Context, sourceID string) (*SourceDTO, error) {
	var src storage.SourceModel
	var availInt, prefInt int
	err := s.db.SqlDB().QueryRowContext(ctx, `
		SELECT id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at
		FROM sources WHERE id = ?
	`, sourceID).Scan(&src.ID, &src.ResourceID, &src.Type, &src.Location, &availInt, &prefInt, &src.OrderIndex, &src.MetadataJSON, &src.CreatedAt, &src.UpdatedAt)
	if err != nil {
		return nil, errors.New("source not found")
	}

	if src.Type != storage.SourceTypeURL {
		return nil, errors.New("only URL sources can be refreshed")
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	meta, available, _ := s.fetcher.FetchURL(fetchCtx, src.Location)
	metadataJSON := ""
	if meta != nil {
		bytes, err := json.Marshal(meta)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	now := time.Now().UnixMilli()
	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, `
			UPDATE sources
			SET available = ?, metadata_json = ?, updated_at = ?
			WHERE id = ?
		`, boolToInt(available), metadataJSON, now, sourceID)
		return err
	})

	if err != nil {
		return nil, err
	}

	return s.getSource(ctx, sourceID)
}

func (s *SourceService) getSource(ctx context.Context, sourceID string) (*SourceDTO, error) {
	row := s.db.SqlDB().QueryRowContext(ctx, `
		SELECT id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at
		FROM sources WHERE id = ?
	`, sourceID)

	var src SourceDTO
	var availInt, prefInt int
	if err := row.Scan(&src.ID, &src.ResourceID, &src.Type, &src.Location, &availInt, &prefInt, &src.OrderIndex, &src.MetadataJSON, &src.CreatedAt, &src.UpdatedAt); err != nil {
		return nil, err
	}
	src.Available = availInt != 0
	src.IsPreferred = prefInt != 0
	return &src, nil
}
