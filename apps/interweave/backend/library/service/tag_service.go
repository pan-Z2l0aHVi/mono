package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// 作为 Wails 外观呈现标签能力，产品规则由 core 承载。
type TagService struct {
	core *core.TagService
	// resources 复用 core 现成的视图装配出口（core API 不新增方法）。
	resources *core.ResourceService
}

// 保持外观与产品规则解耦。
func NewTagService(c *core.TagService, r *core.ResourceService) *TagService {
	return &TagService{core: c, resources: r}
}

// 标准名称决定标签身份，确保全库复用而不依赖别名或层级。
func (s *TagService) AddTagToResource(ctx context.Context, resourceID string, inputTagName string) (*TagDTO, error) {
	tag, err := s.core.AddTagToResource(ctx, resourceID, inputTagName)
	if err != nil {
		return nil, err
	}
	dto := tagToDTO(tag)
	return &dto, nil
}

// 解除单个 Resource 的归属，不暗中改变其他资源。
func (s *TagService) RemoveTagFromResource(ctx context.Context, resourceID string, tagID string) error {
	return s.core.RemoveTagFromResource(ctx, resourceID, tagID)
}

// SetResourceTags 以替换式集合语义重设单个 Resource 的标签集合；规则由 core 承载。
// 回传变更后的完整 Resource 视图，前端不必再往返读取一次。
func (s *TagService) SetResourceTags(ctx context.Context, resourceID string, tagNames []string) (*ResourceDTO, error) {
	if _, err := s.core.SetResourceTags(ctx, resourceID, tagNames); err != nil {
		return nil, err
	}
	view, err := s.resources.GetResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTO(view), nil
}

// 通过已有标签建议降低新建近义标签的概率。
func (s *TagService) SuggestTags(ctx context.Context, query string, limit int) ([]TagDTO, error) {
	tags, err := s.core.SuggestTags(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	return mapped(tags, tagToDTO), nil
}
