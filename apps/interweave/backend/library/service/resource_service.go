package service

import (
	"context"
	"sync"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 作为 Wails 外观呈现 Resource 能力，产品规则与预览授权由 core 承载。
type ResourceService struct {
	core             *core.Library
	urls             media.URLBuilder
	batchConcurrency int

	emitMu sync.RWMutex
	emit   func(name string, data any)

	batchesMu sync.Mutex
	batches   map[string]context.CancelFunc
}

// ResourceServiceOption 装配批量纳入与媒体地址的可选项；并发度、事件出口与 URL 构造器只在装配期注入。
type ResourceServiceOption func(*ResourceService)

// WithBatchConcurrency 覆盖批量纳入的默认并发度，供测试固定行为。
func WithBatchConcurrency(concurrency int) ResourceServiceOption {
	return func(s *ResourceService) {
		if concurrency > 0 {
			s.batchConcurrency = concurrency
		}
	}
}

// WithEventEmitter 注入批量进度的事件出口；Wails 绑定不暴露函数参数，因此只能在装配期注入。
func WithEventEmitter(emit func(name string, data any)) ResourceServiceOption {
	return func(s *ResourceService) {
		s.emit = emit
	}
}

// WithResourceMediaURLBuilder 注入媒体与缩略图 URL 构造器（Windows LocalServer 或默认 AssetServer）。
func WithResourceMediaURLBuilder(urls media.URLBuilder) ResourceServiceOption {
	return func(s *ResourceService) {
		if urls != nil {
			s.urls = urls
		}
	}
}

// 保持外观与产品规则解耦。
func NewResourceService(c *core.Library, options ...ResourceServiceOption) *ResourceService {
	service := &ResourceService{
		core:             c,
		urls:             resolveServiceConfig().urls,
		batchConcurrency: core.DefaultCreateConcurrency,
		batches:          make(map[string]context.CancelFunc),
	}
	for _, option := range options {
		option(service)
	}
	return service
}

func (s *ResourceService) emitEvent(name string, data any) {
	s.emitMu.RLock()
	emit := s.emit
	s.emitMu.RUnlock()
	if emit != nil {
		emit(name, data)
	}
}

// 准备待添加文件的展示分类与短期媒体读取授权（由 core 决定授权类型）。
func (s *ResourceService) PrepareFilePreview(_ context.Context, inputPath string) (*FilePreviewDTO, error) {
	prepared, err := s.core.PrepareFilePreview(inputPath)
	if err != nil {
		return nil, err
	}
	return &FilePreviewDTO{
		Kind:     prepared.Kind,
		Token:    prepared.Token,
		MediaURL: prepared.MediaURL,
	}, nil
}

// ExpandImportPaths 把用户选中的一批文件与文件夹展开为可纳入的文件位置清单。
// 隐藏项、符号链接与非普通文件由 core 过滤；空输入返回空列表。
// Folders 是实际递归展开的顶层文件夹数，供前端决定是否在确认文案里补展开说明。
func (s *ResourceService) ExpandImportPaths(ctx context.Context, paths []string) (ImportExpansionDTO, error) {
	expansion, err := s.core.ExpandImportPaths(ctx, paths)
	if err != nil {
		return ImportExpansionDTO{}, err
	}
	return ImportExpansionDTO{Files: expansion.Files, Folders: expansion.Folders}, nil
}

// ReleaseFilePreview 撤销不再需要的 pending media 授权。
func (s *ResourceService) ReleaseFilePreview(_ context.Context, token string) {
	if token != "" {
		s.core.ReleaseFilePreview(token)
	}
}

// FindResourceLocationMatches 提示库内已登记该入口的 Resource；只读，不改动任何内容。
func (s *ResourceService) FindResourceLocationMatches(
	ctx context.Context,
	input string,
	srcType storage.SourceType,
) ([]ResourceLocationMatchDTO, error) {
	matches, err := s.core.FindResourceLocationMatches(ctx, input, srcType)
	if err != nil {
		return nil, err
	}
	return mapped(matches, func(match core.ResourceLocationMatch) ResourceLocationMatchDTO {
		return ResourceLocationMatchDTO{
			ResourceID: match.ResourceID,
			Title:      match.Title,
			Location:   match.Location,
		}
	}), nil
}

// CreateResource 是纳入新 Resource 的唯一入口：归一化、探测、Resource + 首选 Source
// 与初始标签由 core 在单事务内一次建齐。
func (s *ResourceService) CreateResource(ctx context.Context, input CreateResourceInputDTO) (*ResourceDTO, error) {
	view, err := s.core.CreateResource(ctx, core.CreateResourceInput{
		Kind:         input.Kind,
		Location:     input.Location,
		InitialTitle: input.Title,
		Tags:         input.Tags,
	})
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// 允许用户维护库内语义，不影响外部内容。
func (s *ResourceService) UpdateResourceTitle(ctx context.Context, resourceID string, newTitle string) (*ResourceDTO, error) {
	view, err := s.core.UpdateResourceTitle(ctx, resourceID, newTitle)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// 仅保存简短个人上下文。
func (s *ResourceService) UpdateResourceNote(ctx context.Context, resourceID string, note string) (*ResourceDTO, error) {
	view, err := s.core.UpdateResourceNote(ctx, resourceID, note)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// 从资源库移除记录，不触及任何外部内容。
func (s *ResourceService) DeleteResource(ctx context.Context, resourceID string) error {
	return s.core.DeleteResource(ctx, resourceID)
}

// 以稳定身份读取资源详情。
func (s *ResourceService) GetResource(ctx context.Context, resourceID string) (*ResourceDTO, error) {
	view, err := s.core.GetResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// 以最近纳入优先的顺序支持资源库浏览。
func (s *ResourceService) ListResources(ctx context.Context) ([]ResourceDTO, error) {
	views, err := s.core.ListResources(ctx)
	if err != nil {
		return nil, err
	}
	return mapped(views, func(view core.ResourceView) ResourceDTO {
		return *resourceViewToDTOWithURLs(&view, s.urls)
	}), nil
}
