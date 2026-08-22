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

// 替换入口时保留其在 Resource 中的角色与顺位。
func (s *SourceService) ReplaceFileSource(ctx context.Context, sourceID string, inputPath string) (*SourceDTO, error) {
	src, err := s.core.ReplaceFileSource(ctx, sourceID, inputPath)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
}

// 替换入口时保留其在 Resource 中的角色与顺位。
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

// 仅在用户明确请求时更新远程展示信息。
func (s *SourceService) RefreshURLSource(ctx context.Context, sourceID string) (*SourceDTO, error) {
	src, err := s.core.RefreshURLSource(ctx, sourceID)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(src)
	return &dto, nil
}
