package service

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// 作为 Wails 外观呈现 Source 能力，产品规则由 core 承载。
type SourceService struct {
	core *core.SourceService
}

// 保持外观与产品规则解耦。
func NewSourceService(c *core.SourceService) *SourceService {
	return &SourceService{core: c}
}

// 补充备用入口不应意外改变用户当前的首选入口。
func (s *SourceService) AddFileSource(ctx context.Context, resourceID string, inputPath string) (*SourceDTO, error) {
	src, err := s.core.AddFileSource(ctx, resourceID, inputPath)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
}

// 补充 URL 入口不应覆盖用户已维护的资源语义。
func (s *SourceService) AddURLSource(ctx context.Context, resourceID string, inputURL string) (*SourceDTO, error) {
	src, err := s.core.AddURLSource(ctx, resourceID, inputURL)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
}

// ReplaceFileSource 用新路径找回失效文件，保留 Source 身份、顺位与首选角色；它不是同路径刷新。
func (s *SourceService) ReplaceFileSource(ctx context.Context, sourceID string, inputPath string) (*SourceDTO, error) {
	src, err := s.core.ReplaceFileSource(ctx, sourceID, inputPath)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
}

// ReplaceURLSource 用新 URL 找回失效网页入口，保留 Source 身份、顺位与首选角色；它不是同 URL 刷新。
func (s *SourceService) ReplaceURLSource(ctx context.Context, sourceID string, inputURL string) (*SourceDTO, error) {
	src, err := s.core.ReplaceURLSource(ctx, sourceID, inputURL)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
}

// 首选入口是用户的明确选择，不能出现多个候选。
func (s *SourceService) SetPreferredSource(ctx context.Context, resourceID string, sourceID string) error {
	return s.core.SetPreferredSource(ctx, resourceID, sourceID)
}

// Resource 必须保留至少一个入口；失去首选入口时按既有顺位延续访问路径。
func (s *SourceService) RemoveSource(ctx context.Context, sourceID string) error {
	return s.core.RemoveSource(ctx, sourceID)
}

// RefreshURLSource 重新抓取同一 URL 的展示信息与可用性，不改变 location。
func (s *SourceService) RefreshURLSource(ctx context.Context, sourceID string) (*SourceDTO, error) {
	src, err := s.core.RefreshURLSource(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
}

// RefreshFileSource 重新检查同一文件 path 的可用性，不改变 location；文件在原路径恢复后使用。
func (s *SourceService) RefreshFileSource(ctx context.Context, sourceID string) (*SourceDTO, error) {
	src, err := s.core.RefreshFileSource(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
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
	dto := sourceToDTO(src)
	return &SourceProbeResultDTO{
		Source:  &dto,
		Outcome: sourceProbeOutcomeDTO(outcome),
	}, nil
}
