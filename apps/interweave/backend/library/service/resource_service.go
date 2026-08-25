package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// 作为 Wails 外观呈现 Resource 能力，产品规则由 core 承载。
type ResourceService struct {
	core *core.ResourceService
}

// 保持外观与产品规则解耦。
func NewResourceService(c *core.ResourceService) *ResourceService {
	return &ResourceService{core: c}
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

	result := make([]ResourceDTO, 0, len(views))
	for i := range views {
		result = append(result, *resourceViewToDTO(&views[i]))
	}
	return result, nil
}

// 仅搜索用户维护的上下文与来源基础信息，不扩展为内容索引。
func (s *ResourceService) SearchResources(ctx context.Context, query string) ([]ResourceDTO, error) {
	views, err := s.core.SearchResources(ctx, query)
	if err != nil {
		return nil, err
	}

	result := make([]ResourceDTO, 0, len(views))
	for i := range views {
		result = append(result, *resourceViewToDTO(&views[i]))
	}
	return result, nil
}
