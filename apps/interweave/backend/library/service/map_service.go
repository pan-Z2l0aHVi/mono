package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// 作为 Wails 外观呈现 Map 能力，产品规则由 core 承载。
type MapService struct {
	core *core.MapService
}

// 保持外观与产品规则解耦。
func NewMapService(c *core.MapService) *MapService {
	return &MapService{core: c}
}

// 用标签共现提供全局主题地形，并保留未连通资源的可见性。
func (s *MapService) GetGlobalMap(ctx context.Context) (*GlobalMapDTO, error) {
	m, err := s.core.GetGlobalMap(ctx)
	if err != nil {
		return nil, err
	}

	dto := &GlobalMapDTO{
		UnconnectedCount:   m.UnconnectedCount,
		TotalResourceCount: m.TotalResourceCount,
	}
	dto.TagNodes = mapped(m.TagNodes, toTagNodeDTO)
	dto.TagEdges = mapped(m.TagEdges, toTagEdgeDTO)
	return dto, nil
}

// 局部探索只围绕用户当前选择的主题展开。
func (s *MapService) GetLocalMap(ctx context.Context, tagID string) (*LocalMapDTO, error) {
	m, err := s.core.GetLocalMap(ctx, tagID)
	if err != nil {
		return nil, err
	}

	dto := &LocalMapDTO{
		FocusedTag: tagToDTO(m.FocusedTag),
	}
	dto.Resources = mapped(m.Resources, func(v core.ResourceView) ResourceDTO {
		return *resourceViewToDTO(&v)
	})
	dto.CooccurringTags = mapped(m.CooccurringTags, toTagNodeDTO)
	return dto, nil
}
