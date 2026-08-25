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
	for _, n := range m.TagNodes {
		dto.TagNodes = append(dto.TagNodes, toTagNodeDTO(n))
	}
	for _, e := range m.TagEdges {
		dto.TagEdges = append(dto.TagEdges, TagEdgeDTO{
			SourceTagID: e.SourceTagID,
			TargetTagID: e.TargetTagID,
			Weight:      e.Weight,
		})
	}
	if dto.TagNodes == nil {
		dto.TagNodes = []TagNodeDTO{}
	}
	if dto.TagEdges == nil {
		dto.TagEdges = []TagEdgeDTO{}
	}
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
	for i := range m.Resources {
		dto.Resources = append(dto.Resources, *resourceViewToDTO(&m.Resources[i]))
	}
	if dto.Resources == nil {
		dto.Resources = []ResourceDTO{}
	}
	for _, n := range m.CooccurringTags {
		dto.CooccurringTags = append(dto.CooccurringTags, toTagNodeDTO(n))
	}
	if dto.CooccurringTags == nil {
		dto.CooccurringTags = []TagNodeDTO{}
	}
	return dto, nil
}
