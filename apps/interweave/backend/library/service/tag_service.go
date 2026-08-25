package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// 作为 Wails 外观呈现标签能力，产品规则由 core 承载。
type TagService struct {
	core *core.TagService
}

// 保持外观与产品规则解耦。
func NewTagService(c *core.TagService) *TagService {
	return &TagService{core: c}
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

// 通过已有标签建议降低新建近义标签的概率。
func (s *TagService) SuggestTags(ctx context.Context, query string, limit int) ([]TagDTO, error) {
	tags, err := s.core.SuggestTags(ctx, query, limit)
	if err != nil {
		return nil, err
	}

	result := make([]TagDTO, 0, len(tags))
	for _, tag := range tags {
		result = append(result, tagToDTO(tag))
	}
	return result, nil
}
