package core

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 聚合 Resource 生命周期中不涉及外部内容修改的产品规则。
type ResourceService struct {
	db        *storage.DB
	ingest    *ingestion
	views     viewAssembler
	resources storage.ResourceStore
}

// 保持资源规则与持久化实现解耦。
func NewResourceService(db *storage.DB, fetcher *remote.Fetcher) *ResourceService {
	return &ResourceService{
		db:        db,
		ingest:    newIngestion(db, fetcher),
		views:     viewAssembler{},
		resources: storage.ResourceStore{},
	}
}

// 纳入文件时只确认入口可达性，不读取或接管内容。
func (s *ResourceService) AddFileResource(ctx context.Context, inputPath string) (*ResourceView, error) {
	location, err := s.ingest.normalizeInput(inputPath, storage.SourceTypeFile)
	if err != nil {
		return nil, err
	}

	outcome := s.ingest.probe(ctx, location, storage.SourceTypeFile)
	result, err := s.ingest.write(ctx, ingestWrite{
		mode:         ingestNewResource,
		defaultTitle: outcome.defaultTitle,
		srcType:      storage.SourceTypeFile,
		location:     location,
		probe:        outcome,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create file resource: %w", err)
	}

	return s.GetResource(ctx, result.resourceID)
}

// URL 纳入以一次限时抓取建立初始展示上下文，失败也保留用户入口。
func (s *ResourceService) AddURLResource(ctx context.Context, inputURL string) (*ResourceView, error) {
	location, err := s.ingest.normalizeInput(inputURL, storage.SourceTypeURL)
	if err != nil {
		return nil, err
	}

	outcome := s.ingest.probe(ctx, location, storage.SourceTypeURL)
	result, err := s.ingest.write(ctx, ingestWrite{
		mode:         ingestNewResource,
		defaultTitle: outcome.defaultTitle,
		srcType:      storage.SourceTypeURL,
		location:     location,
		probe:        outcome,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create URL resource: %w", err)
	}

	return s.GetResource(ctx, result.resourceID)
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

	views, err := s.views.assembleMany(ctx, s.db.SqlDB(), []Resource{res})
	if err != nil {
		return nil, err
	}
	return &views[0], nil
}

// 以最近纳入优先的顺序支持资源库浏览。
func (s *ResourceService) ListResources(ctx context.Context) ([]ResourceView, error) {
	models, err := s.resources.List(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}
	return s.views.assembleMany(ctx, s.db.SqlDB(), models)
}

// 仅搜索用户维护的上下文与来源基础信息，不扩展为内容索引。
func (s *ResourceService) SearchResources(ctx context.Context, query string) ([]ResourceView, error) {
	trimmed := strings.TrimSpace(query)
	if trimmed == "" {
		return s.ListResources(ctx)
	}

	likePattern := "%" + escapeLike(trimmed) + "%"
	models, err := s.resources.Search(ctx, s.db.SqlDB(), likePattern)
	if err != nil {
		return nil, err
	}
	return s.views.assembleMany(ctx, s.db.SqlDB(), models)
}
