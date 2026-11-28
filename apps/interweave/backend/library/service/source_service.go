package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 作为 Wails 外观呈现 Source 能力，产品规则与写后完整视图回读由 core 承载。
type SourceService struct {
	core *core.Library
	urls media.URLBuilder
}

// 保持外观与产品规则解耦。
func NewSourceService(c *core.Library, opts ...ServiceOption) *SourceService {
	cfg := resolveServiceConfig(opts...)
	return &SourceService{core: c, urls: cfg.urls}
}

// AddSource 补充备用入口，不改变用户当前的首选入口，也不覆盖已维护的资源语义。
func (s *SourceService) AddSource(ctx context.Context, resourceID string, srcType storage.SourceType, input string) (*ResourceDTO, error) {
	view, err := s.core.AddSource(ctx, resourceID, srcType, input)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// ReplaceSource 用新位置找回失效入口，保留 Source 身份、顺位、类型与首选角色；它不是同位置刷新。
func (s *SourceService) ReplaceSource(ctx context.Context, sourceID string, input string) (*ResourceDTO, error) {
	view, err := s.core.ReplaceSource(ctx, sourceID, input)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// 首选入口是用户的明确选择，不能出现多个候选。
func (s *SourceService) SetPreferredSource(ctx context.Context, resourceID string, sourceID string) (*ResourceDTO, error) {
	view, err := s.core.SetPreferredSource(ctx, resourceID, sourceID)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// Resource 必须保留至少一个入口；失去首选入口时按既有顺位延续访问路径。
func (s *SourceService) RemoveSource(ctx context.Context, sourceID string) (*ResourceDTO, error) {
	view, err := s.core.RemoveSource(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// RefreshSource 重新检查同一位置的可用性与展示信息，不改变 location；类型由存量 Source 决定。
func (s *SourceService) RefreshSource(ctx context.Context, sourceID string) (*ResourceDTO, error) {
	view, err := s.core.RefreshSource(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTOWithURLs(view, s.urls), nil
}

// ProbeURLSourceOnOpen 在用户打开详情时以短预算重新判定 URL 可用性。
//
// 与手动刷新的差别只在三态：Inconclusive 不落库、不改变失效角标，只回一句用户可见文案。
// 前端默认只在当前判为不可用时调用它（死链恢复才需要重新判定）。
func (s *SourceService) ProbeURLSourceOnOpen(ctx context.Context, sourceID string) (*SourceProbeResultDTO, error) {
	result, err := s.core.ProbeURLSourceOnOpen(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	if result.Outcome == core.ProbeOutcomeInconclusive {
		return &SourceProbeResultDTO{
			Outcome: SourceProbeOutcomeInconclusive,
			Message: core.ErrURLProbeInconclusive.Error(),
		}, nil
	}
	dto := sourceToDTOWithURLs(result.Source, s.urls)
	return &SourceProbeResultDTO{
		Source:   &dto,
		Resource: resourceViewToDTOWithURLs(result.Resource, s.urls),
		Outcome:  sourceProbeOutcomeDTO(result.Outcome),
	}, nil
}
