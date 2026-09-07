package core

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 维护 Resource 的外部入口，同时保证 Resource 始终可被保留。
type SourceService struct {
	db        *storage.DB
	ingest    *ingestion
	resources storage.ResourceStore
	sources   storage.SourceStore
}

// 保持 Source 规则与持久化实现解耦。
func NewSourceService(db *storage.DB, fetcher *remote.Fetcher) *SourceService {
	return &SourceService{
		db:        db,
		ingest:    newIngestion(db, fetcher),
		resources: storage.ResourceStore{},
		sources:   storage.SourceStore{},
	}
}

// 补充备用入口不应意外改变用户当前的首选入口。
func (s *SourceService) AddFileSource(ctx context.Context, resourceID string, inputPath string) (Source, error) {
	location, err := s.ingest.normalizeInput(inputPath, storage.SourceTypeFile)
	if err != nil {
		return Source{}, err
	}

	// 归属目标的存在性是产品规则，不依赖外键约束兜底。
	if err := s.requireResource(ctx, resourceID); err != nil {
		return Source{}, err
	}

	outcome := s.ingest.probe(ctx, location, storage.SourceTypeFile)
	result, err := s.ingest.write(ctx, ingestWrite{
		mode:       ingestAppendSource,
		resourceID: resourceID,
		srcType:    storage.SourceTypeFile,
		location:   location,
		probe:      outcome,
	})
	if err != nil {
		return Source{}, fmt.Errorf("failed to add file source: %w", err)
	}

	return s.getSource(ctx, result.sourceID)
}

// 补充 URL 入口不应覆盖用户已维护的资源语义。
func (s *SourceService) AddURLSource(ctx context.Context, resourceID string, inputURL string) (Source, error) {
	location, err := s.ingest.normalizeInput(inputURL, storage.SourceTypeURL)
	if err != nil {
		return Source{}, err
	}

	// 抓取最多阻塞 10 秒，必须在不存在的归属目标上先短路。
	if err := s.requireResource(ctx, resourceID); err != nil {
		return Source{}, err
	}

	outcome := s.ingest.probe(ctx, location, storage.SourceTypeURL)
	result, err := s.ingest.write(ctx, ingestWrite{
		mode:       ingestAppendSource,
		resourceID: resourceID,
		srcType:    storage.SourceTypeURL,
		location:   location,
		probe:      outcome,
	})
	if err != nil {
		return Source{}, fmt.Errorf("failed to add URL source: %w", err)
	}

	return s.getSource(ctx, result.sourceID)
}

// 替换入口时保留其在 Resource 中的角色与顺位。
func (s *SourceService) ReplaceFileSource(ctx context.Context, sourceID string, inputPath string) (Source, error) {
	location, err := s.ingest.normalizeInput(inputPath, storage.SourceTypeFile)
	if err != nil {
		return Source{}, err
	}

	if err := s.requireSource(ctx, sourceID); err != nil {
		return Source{}, err
	}

	outcome := s.ingest.probe(ctx, location, storage.SourceTypeFile)
	_, err = s.ingest.write(ctx, ingestWrite{
		mode:     ingestReplaceSource,
		sourceID: sourceID,
		srcType:  storage.SourceTypeFile,
		location: location,
		probe:    outcome,
	})
	if err != nil {
		return Source{}, fmt.Errorf("failed to replace source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 替换入口时保留其在 Resource 中的角色与顺位。
func (s *SourceService) ReplaceURLSource(ctx context.Context, sourceID string, inputURL string) (Source, error) {
	location, err := s.ingest.normalizeInput(inputURL, storage.SourceTypeURL)
	if err != nil {
		return Source{}, err
	}

	// 抓取最多阻塞 10 秒，必须在不存在的 Source 上先短路。
	if err := s.requireSource(ctx, sourceID); err != nil {
		return Source{}, err
	}

	outcome := s.ingest.probe(ctx, location, storage.SourceTypeURL)
	_, err = s.ingest.write(ctx, ingestWrite{
		mode:     ingestReplaceSource,
		sourceID: sourceID,
		srcType:  storage.SourceTypeURL,
		location: location,
		probe:    outcome,
	})
	if err != nil {
		return Source{}, fmt.Errorf("failed to replace source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 首选入口是用户的明确选择，不能出现多个候选。
func (s *SourceService) SetPreferredSource(ctx context.Context, resourceID string, sourceID string) error {
	now := time.Now().UnixMilli()
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 先清除旧选择，维持唯一首选的不变量。
		if err := s.sources.ClearPreferred(ctx, tx, resourceID, now); err != nil {
			return err
		}
		err := s.sources.SetPreferred(ctx, tx, sourceID, resourceID, now)
		if errors.Is(err, storage.ErrSourceNotFound) {
			return ErrSourceNotFoundOnResource
		}
		return err
	})
}

// Resource 必须保留至少一个入口；失去首选入口时按既有顺位延续访问路径。
func (s *SourceService) RemoveSource(ctx context.Context, sourceID string) error {
	now := time.Now().UnixMilli()
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		src, err := s.sources.Get(ctx, tx, sourceID)
		if err != nil {
			return mapNotFound(err)
		}

		count, err := s.sources.CountByResource(ctx, tx, src.ResourceID)
		if err != nil {
			return err
		}
		if count <= 1 {
			return ErrCannotRemoveOnlySource
		}

		if err := s.sources.Delete(ctx, tx, sourceID); err != nil {
			return err
		}

		if src.IsPreferred {
			// 以既有顺位恢复默认入口，避免引入新的猜测。
			nextPreferredID, err := s.sources.NextPreferredID(ctx, tx, src.ResourceID)
			if err != nil {
				return err
			}
			return s.sources.SetPreferred(ctx, tx, nextPreferredID, src.ResourceID, now)
		}
		return nil
	})
}

// 仅在用户明确请求时更新远程展示信息。
func (s *SourceService) RefreshURLSource(ctx context.Context, sourceID string) (Source, error) {
	src, err := s.sources.Get(ctx, s.db.SqlDB(), sourceID)
	if err != nil {
		return Source{}, mapNotFound(err)
	}

	if src.Type != storage.SourceTypeURL {
		return Source{}, ErrOnlyURLSourceRefreshable
	}

	// 位置在纳入时已归一化，刷新直接探测原位置，不回写 Resource 标题（ADR-0023）。
	outcome := s.ingest.probe(ctx, src.Location, storage.SourceTypeURL)
	_, err = s.ingest.write(ctx, ingestWrite{
		mode:     ingestRefreshSource,
		sourceID: sourceID,
		probe:    outcome,
	})
	if err != nil {
		return Source{}, err
	}

	return s.getSource(ctx, sourceID)
}

func (s *SourceService) getSource(ctx context.Context, sourceID string) (Source, error) {
	src, err := s.sources.Get(ctx, s.db.SqlDB(), sourceID)
	if err != nil {
		return Source{}, mapNotFound(err)
	}
	return src, nil
}

// 写入归属前确认目标 Resource 存在，返回用户可见的哨兵文案而非 SQL 错误。
func (s *SourceService) requireResource(ctx context.Context, resourceID string) error {
	exists, err := s.resources.Exists(ctx, s.db.SqlDB(), resourceID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrResourceNotFound
	}
	return nil
}

// 替换与抓取前确认目标 Source 存在，避免对无效目标做无效工作。
func (s *SourceService) requireSource(ctx context.Context, sourceID string) error {
	if _, err := s.sources.Get(ctx, s.db.SqlDB(), sourceID); err != nil {
		return mapNotFound(err)
	}
	return nil
}
