package core

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
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
	sources   storage.SourceStore
	// indexSync 只在装配期注入一次（main.go），运行期只读，无需加锁。
	indexSync SourceIndexSync
}

// PreparedFilePreview 是待添加文件的稳定位置与权威展示分类。
type PreparedFilePreview struct {
	Location string
	Kind     storage.ResourceKind
}

// ResourceLocationMatch 是「库内已有同一入口」的命中项，只带确认框需要的字段。
type ResourceLocationMatch struct {
	ResourceID string
	Title      string
	Location   string
}

// 保持资源规则与持久化实现解耦。
func NewResourceService(db *storage.DB, fetcher *remote.Fetcher) *ResourceService {
	return &ResourceService{
		db:        db,
		ingest:    newIngestion(db, fetcher),
		views:     viewAssembler{},
		resources: storage.ResourceStore{},
		sources:   storage.SourceStore{},
	}
}

// SetIndexSync 注入入口集合的对账回调，使增删 Resource 后监听集合能立即重建。
func (s *ResourceService) SetIndexSync(h SourceIndexSync) {
	s.indexSync = h
}

// 入口集合变化后请求监听重建；对账失败不回滚已提交的事务，下一次对账会补上。
func (s *ResourceService) resyncIndex(ctx context.Context) {
	if s.indexSync == nil {
		return
	}
	_ = s.indexSync.SyncSources(ctx)
}

// 规范化待添加文件并复用 Resource 展示分类，不读取文件内容。
func (s *ResourceService) PrepareFilePreview(inputPath string) (PreparedFilePreview, error) {
	location, err := s.ingest.normalizeInput(inputPath, storage.SourceTypeFile)
	if err != nil {
		return PreparedFilePreview{}, err
	}
	return PreparedFilePreview{Location: location, Kind: resourceKindForFile(location)}, nil
}

// 按归一化位置反查库内已有该入口的 Resource，供添加前的重复提示使用。
// 比对以 normalizeInput 的结果为准，因此 `~/a.png` 与其绝对路径命中同一条记录。
func (s *ResourceService) FindResourceLocationMatches(
	ctx context.Context,
	input string,
	srcType storage.SourceType,
) ([]ResourceLocationMatch, error) {
	location, err := s.ingest.normalizeInput(input, srcType)
	if err != nil {
		return nil, err
	}

	sources, err := s.sources.ListSourcesByLocations(ctx, s.db.SqlDB(), srcType, []string{location})
	if err != nil {
		return nil, err
	}
	if len(sources) == 0 {
		return []ResourceLocationMatch{}, nil
	}

	// 同一 Resource 可能在同一位置登记多条 Source（CONTEXT.md「重复 Source」），
	// 提示按 Resource 去重：用户看到的是「已有哪几个资源」，不是「有几条记录」。
	resourceIDs := make([]string, 0, len(sources))
	seen := make(map[string]bool, len(sources))
	for _, src := range sources {
		if seen[src.ResourceID] {
			continue
		}
		seen[src.ResourceID] = true
		resourceIDs = append(resourceIDs, src.ResourceID)
	}

	views, err := s.views.assembleByIDs(ctx, s.db.SqlDB(), resourceIDs)
	if err != nil {
		return nil, err
	}
	// 按纳入时间倒序，与 ListResources 的浏览顺序一致；ID 兜底使同毫秒创建也有确定顺序。
	sort.SliceStable(views, func(i, j int) bool {
		if views[i].Resource.CreatedAt != views[j].Resource.CreatedAt {
			return views[i].Resource.CreatedAt > views[j].Resource.CreatedAt
		}
		return views[i].Resource.ID < views[j].Resource.ID
	})

	matches := make([]ResourceLocationMatch, 0, len(views))
	for _, view := range views {
		matches = append(matches, ResourceLocationMatch{
			ResourceID: view.Resource.ID,
			Title:      view.Resource.Title,
			Location:   location,
		})
	}
	return matches, nil
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

	s.resyncIndex(ctx)
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

	s.resyncIndex(ctx)
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
	if err != nil {
		return err
	}

	// 外键 ON DELETE CASCADE 已连带删除该 Resource 的 Source，监听集合需要跟着收敛。
	s.resyncIndex(ctx)
	return nil
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
