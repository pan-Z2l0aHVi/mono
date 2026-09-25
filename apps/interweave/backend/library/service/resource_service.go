package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 作为 Wails 外观呈现 Resource 能力，产品规则由 core 承载。
type ResourceService struct {
	core     *core.ResourceService
	previews *media.PendingPreviewRegistry
}

// 保持外观与产品规则解耦。
func NewResourceService(c *core.ResourceService, previews *media.PendingPreviewRegistry) *ResourceService {
	return &ResourceService{core: c, previews: previews}
}

// 准备待添加文件的展示分类；只有图片与视频获得短期媒体读取授权。
func (s *ResourceService) PrepareFilePreview(_ context.Context, inputPath string) (*FilePreviewDTO, error) {
	prepared, err := s.core.PrepareFilePreview(inputPath)
	if err != nil {
		return nil, err
	}
	preview := &FilePreviewDTO{Kind: prepared.Kind}
	if prepared.Kind != storage.ResourceKindImage && prepared.Kind != storage.ResourceKindVideo {
		return preview, nil
	}
	token, err := s.previews.Register(prepared.Location)
	if err != nil {
		return nil, err
	}
	preview.Token = token
	return preview, nil
}

// ReleaseFilePreview 撤销不再需要的 pending media 授权。
func (s *ResourceService) ReleaseFilePreview(_ context.Context, token string) {
	if token != "" {
		s.previews.Release(token)
	}
}

// ServiceShutdown 在应用退出时撤销全部 pending media 授权。
func (s *ResourceService) ServiceShutdown() error {
	s.previews.Clear()
	return nil
}

// 纳入文件时只确认入口可达性，不读取或接管内容。
func (s *ResourceService) AddFileResource(ctx context.Context, inputPath string) (*ResourceDTO, error) {
	view, err := s.core.AddFileResource(ctx, inputPath)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTO(view), nil
}

// URL 纳入以一次限时抓取建立初始展示上下文，失败也保留用户入口。
func (s *ResourceService) AddURLResource(ctx context.Context, inputURL string) (*ResourceDTO, error) {
	view, err := s.core.AddURLResource(ctx, inputURL)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTO(view), nil
}

// 允许用户维护库内语义，不影响外部内容。
func (s *ResourceService) UpdateResourceTitle(ctx context.Context, resourceID string, newTitle string) (*ResourceDTO, error) {
	view, err := s.core.UpdateResourceTitle(ctx, resourceID, newTitle)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTO(view), nil
}

// 仅保存简短个人上下文。
func (s *ResourceService) UpdateResourceNote(ctx context.Context, resourceID string, note string) (*ResourceDTO, error) {
	view, err := s.core.UpdateResourceNote(ctx, resourceID, note)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTO(view), nil
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
	return resourceViewToDTO(view), nil
}

// 以最近纳入优先的顺序支持资源库浏览。
func (s *ResourceService) ListResources(ctx context.Context) ([]ResourceDTO, error) {
	views, err := s.core.ListResources(ctx)
	if err != nil {
		return nil, err
	}

	return mapped(views, func(view core.ResourceView) ResourceDTO {
		return *resourceViewToDTO(&view)
	}), nil
}

// 仅搜索用户维护的上下文与来源基础信息，不扩展为内容索引。
func (s *ResourceService) SearchResources(ctx context.Context, query string) ([]ResourceDTO, error) {
	views, err := s.core.SearchResources(ctx, query)
	if err != nil {
		return nil, err
	}

	return mapped(views, func(view core.ResourceView) ResourceDTO {
		return *resourceViewToDTO(&view)
	}), nil
}
