package core

import (
	"context"
	"database/sql"
	"encoding/json"
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
func (s *ResourceService) AddFileResource(ctx context.Context, inputPath string) (*ResourceView, error) {
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
	res := Resource{
		ID:        id.NewID(),
		Title:     defaultTitle,
		Note:      "",
		CreatedAt: now,
		UpdatedAt: now,
	}
	src := Source{
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
func (s *ResourceService) AddURLResource(ctx context.Context, inputURL string) (*ResourceView, error) {
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
	res := Resource{
		ID:        id.NewID(),
		Title:     defaultTitle,
		Note:      "",
		CreatedAt: now,
		UpdatedAt: now,
	}
	src := Source{
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
func (s *ResourceService) UpdateResourceTitle(ctx context.Context, resourceID string, newTitle string) (*ResourceView, error) {
	trimmed := strings.TrimSpace(newTitle)
	if trimmed == "" {
		return nil, ErrResourceTitleEmpty
	}

	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return mapNotFound(s.resources.UpdateTitle(ctx, tx, resourceID, trimmed, now))
	})
	if err != nil {
		return nil, err
	}

	return s.GetResource(ctx, resourceID)
}

// 仅保存简短个人上下文。
func (s *ResourceService) UpdateResourceNote(ctx context.Context, resourceID string, note string) (*ResourceView, error) {
	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return mapNotFound(s.resources.UpdateNote(ctx, tx, resourceID, note, now))
	})
	if err != nil {
		return nil, err
	}

	return s.GetResource(ctx, resourceID)
}

// 从资源库移除记录，不触及任何外部内容。
func (s *ResourceService) DeleteResource(ctx context.Context, resourceID string) error {
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return mapNotFound(s.resources.Delete(ctx, tx, resourceID))
	})
	return err
}

// 以稳定身份读取资源详情。
func (s *ResourceService) GetResource(ctx context.Context, resourceID string) (*ResourceView, error) {
	res, err := s.resources.Get(ctx, s.db.SqlDB(), resourceID)
	if err != nil {
		return nil, mapNotFound(err)
	}
	return s.assembleView(ctx, res)
}

// 以最近纳入优先的顺序支持资源库浏览。
func (s *ResourceService) ListResources(ctx context.Context) ([]ResourceView, error) {
	models, err := s.resources.List(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}

	result := make([]ResourceView, 0, len(models))
	for _, res := range models {
		view, err := s.assembleView(ctx, res)
		if err != nil {
			return nil, err
		}
		result = append(result, *view)
	}
	return result, nil
}

// 仅搜索用户维护的上下文与来源基础信息，不扩展为内容索引。
func (s *ResourceService) SearchResources(ctx context.Context, query string) ([]ResourceView, error) {
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return s.ListResources(ctx)
	}

	likePattern := "%" + trimmed + "%"
	models, err := s.resources.Search(ctx, s.db.SqlDB(), likePattern)
	if err != nil {
		return nil, err
	}

	result := make([]ResourceView, 0, len(models))
	for _, res := range models {
		view, err := s.assembleView(ctx, res)
		if err != nil {
			return nil, err
		}
		result = append(result, *view)
	}
	return result, nil
}

// 装配 Resource 视图，来源与标签均从持久化读取。
func (s *ResourceService) assembleView(ctx context.Context, res Resource) (*ResourceView, error) {
	view := &ResourceView{Resource: res}

	sources, err := s.sources.ListByResource(ctx, s.db.SqlDB(), res.ID)
	if err != nil {
		return nil, err
	}
	view.Sources = sources
	if view.Sources == nil {
		view.Sources = []Source{}
	}

	tags, err := s.tags.TagsByResource(ctx, s.db.SqlDB(), res.ID)
	if err != nil {
		return nil, err
	}
	view.Tags = tags
	if view.Tags == nil {
		view.Tags = []Tag{}
	}

	return view, nil
}
