package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 作为 Wails 外观呈现 Source 能力，产品规则由 core 承载。
// 变更类方法直接回传变更后的完整 Resource 视图，前端不再二次往返读取。
type SourceService struct {
	core *core.Library
}

// 保持外观与产品规则解耦。
func NewSourceService(c *core.Library) *SourceService {
	return &SourceService{core: c}
}

// 变更落库后按 resource_id 装配完整资源视图；变更后的 Source 在 resource.sources 里按 id 可取。
func (s *SourceService) resourceDTO(ctx context.Context, resourceID string) (*ResourceDTO, error) {
	view, err := s.core.GetResource(ctx, resourceID)
	if err != nil {
		return nil, err
	}
	return resourceViewToDTO(view), nil
}

// AddSource 补充备用入口，不改变用户当前的首选入口，也不覆盖已维护的资源语义。
func (s *SourceService) AddSource(ctx context.Context, resourceID string, srcType storage.SourceType, input string) (*ResourceDTO, error) {
	if _, err := s.core.AddSource(ctx, resourceID, srcType, input); err != nil {
		return nil, err
	}
	return s.resourceDTO(ctx, resourceID)
}

// ReplaceSource 用新位置找回失效入口，保留 Source 身份、顺位、类型与首选角色；它不是同位置刷新。
func (s *SourceService) ReplaceSource(ctx context.Context, sourceID string, input string) (*ResourceDTO, error) {
	src, err := s.core.ReplaceSource(ctx, sourceID, input)
	if err != nil {
		return nil, err
	}
	return s.resourceDTO(ctx, src.ResourceID)
}

// 首选入口是用户的明确选择，不能出现多个候选。
func (s *SourceService) SetPreferredSource(ctx context.Context, resourceID string, sourceID string) (*ResourceDTO, error) {
	if err := s.core.SetPreferredSource(ctx, resourceID, sourceID); err != nil {
		return nil, err
	}
	return s.resourceDTO(ctx, resourceID)
}

// Resource 必须保留至少一个入口；失去首选入口时按既有顺位延续访问路径。
func (s *SourceService) RemoveSource(ctx context.Context, sourceID string) (*ResourceDTO, error) {
	resourceID, err := s.core.RemoveSource(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	return s.resourceDTO(ctx, resourceID)
}

// RefreshSource 重新检查同一位置的可用性与展示信息，不改变 location；类型由存量 Source 决定。
func (s *SourceService) RefreshSource(ctx context.Context, sourceID string) (*ResourceDTO, error) {
	src, err := s.core.RefreshSource(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	return s.resourceDTO(ctx, src.ResourceID)
}

// ProbeURLSourceOnOpen 在用户打开详情时以短预算重新判定 URL 可用性。
//
// 与手动刷新的差别只在三态：Inconclusive 不落库、不改变失效角标，只回一句用户可见文案。
// 前端默认只在当前判为不可用时调用它（死链恢复才需要重新判定）。
func (s *SourceService) ProbeURLSourceOnOpen(ctx context.Context, sourceID string) (*SourceProbeResultDTO, error) {
	src, outcome, err := s.core.ProbeURLSourceOnOpen(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	if outcome == core.ProbeOutcomeInconclusive {
		return &SourceProbeResultDTO{
			Outcome: SourceProbeOutcomeInconclusive,
			Message: core.ErrURLProbeInconclusive.Error(),
		}, nil
	}
	resource, err := s.resourceDTO(ctx, src.ResourceID)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &SourceProbeResultDTO{
		Source:   &dto,
		Resource: resource,
		Outcome:  sourceProbeOutcomeDTO(outcome),
	}, nil
}
