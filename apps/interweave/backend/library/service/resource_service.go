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
	db        *storage.DB
	fetcher   *remote.Fetcher
	resources storage.ResourceStore
	sources   storage.SourceStore
	tags      storage.TagStore
}

// 保持资源规则与持久化实现解耦。
func NewResourceService(db *storage.DB, fetcher *remote.Fetcher) *ResourceService {
	return &ResourceService{
		db:        db,
		fetcher:   fetcher,
		resources: storage.ResourceStore{},
		sources:   storage.SourceStore{},
		tags:      storage.TagStore{},
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
	res := storage.ResourceModel{
		ID:        id.NewID(),
		Title:     defaultTitle,
		Note:      "",
		CreatedAt: now,
		UpdatedAt: now,
	}
	src := storage.SourceModel{
		ID:          id.NewID(),
		ResourceID:  res.ID,
		Type:        storage.SourceTypeFile,
		Location:    cleanPath,
		Available:   available,
		IsPreferred: true,
		OrderIndex:  0,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		if err := s.resources.Insert(ctx, tx, res); err != nil {
			return err
		}
		return s.sources.Insert(ctx, tx, src)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create file resource: %w", err)
	}

	return s.GetResource(ctx, res.ID)
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
	res := storage.ResourceModel{
		ID:        id.NewID(),
		Title:     defaultTitle,
		Note:      "",
		CreatedAt: now,
		UpdatedAt: now,
	}
	src := storage.SourceModel{
		ID:           id.NewID(),
		ResourceID:   res.ID,
		Type:         storage.SourceTypeURL,
		Location:     normURL,
		Available:    available,
		IsPreferred:  true,
		OrderIndex:   0,
		MetadataJSON: metadataJSON,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		if err := s.resources.Insert(ctx, tx, res); err != nil {
			return err
		}
		return s.sources.Insert(ctx, tx, src)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create URL resource: %w", err)
	}

	return s.GetResource(ctx, res.ID)
}

// 允许用户维护库内语义，不影响外部内容。
func (s *ResourceService) UpdateResourceTitle(ctx context.Context, resourceID string, newTitle string) (*ResourceDTO, error) {
	trimmed := strings.TrimSpace(newTitle)
	if trimmed == "" {
		return nil, errors.New("resource title cannot be empty")
	}

	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		err := s.resources.UpdateTitle(ctx, tx, resourceID, trimmed, now)
		if errors.Is(err, storage.ErrResourceNotFound) {
			return errors.New("resource not found")
		}
		return err
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
		err := s.resources.UpdateNote(ctx, tx, resourceID, note, now)
		if errors.Is(err, storage.ErrResourceNotFound) {
			return errors.New("resource not found")
		}
		return err
	})
	if err != nil {
		return nil, err
	}

	return s.GetResource(ctx, resourceID)
}

// 从资源库移除记录，不触及任何外部内容。
func (s *ResourceService) DeleteResource(ctx context.Context, resourceID string) error {
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		err := s.resources.Delete(ctx, tx, resourceID)
		if errors.Is(err, storage.ErrResourceNotFound) {
			return errors.New("resource not found")
		}
		return err
	})
	return err
}

// 以稳定身份读取资源详情。
func (s *ResourceService) GetResource(ctx context.Context, resourceID string) (*ResourceDTO, error) {
	res, err := s.resources.Get(ctx, s.db.SqlDB(), resourceID)
	if err != nil {
		if errors.Is(err, storage.ErrResourceNotFound) {
			return nil, errors.New("resource not found")
		}
		return nil, err
	}

	return s.assembleResource(ctx, res)
}

// 以最近纳入优先的顺序支持资源库浏览。
func (s *ResourceService) ListResources(ctx context.Context) ([]ResourceDTO, error) {
	models, err := s.resources.List(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}

	result := make([]ResourceDTO, 0, len(models))
	for _, res := range models {
		dto, err := s.assembleResource(ctx, res)
		if err != nil {
			return nil, err
		}
		result = append(result, *dto)
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
	models, err := s.resources.Search(ctx, s.db.SqlDB(), likePattern)
	if err != nil {
		return nil, err
	}

	result := make([]ResourceDTO, 0, len(models))
	for _, res := range models {
		dto, err := s.assembleResource(ctx, res)
		if err != nil {
			return nil, err
		}
		result = append(result, *dto)
	}
	return result, nil
}

// 组装 Resource 的前端视图，来源与标签均从持久化读取。
func (s *ResourceService) assembleResource(ctx context.Context, res storage.ResourceModel) (*ResourceDTO, error) {
	dto := &ResourceDTO{
		ID:        res.ID,
		Title:     res.Title,
		Note:      res.Note,
		CreatedAt: res.CreatedAt,
		UpdatedAt: res.UpdatedAt,
	}

	sources, err := s.sources.ListByResource(ctx, s.db.SqlDB(), res.ID)
	if err != nil {
		return nil, err
	}
	for _, src := range sources {
		srcDTO := sourceToDTO(src)
		dto.Sources = append(dto.Sources, srcDTO)
		if dto.PreferredID == "" && srcDTO.IsPreferred {
			dto.PreferredID = srcDTO.ID
		}
	}
	if dto.Sources == nil {
		dto.Sources = []SourceDTO{}
	}

	tags, err := s.tags.TagsByResource(ctx, s.db.SqlDB(), res.ID)
	if err != nil {
		return nil, err
	}
	for _, tag := range tags {
		dto.Tags = append(dto.Tags, tagToDTO(tag))
	}
	if dto.Tags == nil {
		dto.Tags = []TagDTO{}
	}

	return dto, nil
}
