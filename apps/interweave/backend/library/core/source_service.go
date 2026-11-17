package core

import (
	"context"
	"database/sql"
	"encoding/json"
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
	// indexSync 只在装配期注入一次（main.go），运行期只读，无需加锁。
	indexSync SourceIndexSync
	// recovery 拥有找回扫描的会话状态机；扫描算法是本服务的 ScanRecovery。
	recovery *RecoveryScanRunner
}

// 保持 Source 规则与持久化实现解耦。
func NewSourceService(db *storage.DB, fetcher *remote.Fetcher) *SourceService {
	svc := &SourceService{
		db:        db,
		ingest:    newIngestion(db, fetcher),
		resources: storage.ResourceStore{},
		sources:   storage.SourceStore{},
	}
	svc.recovery = NewRecoveryScanRunner(svc.ScanRecovery)
	return svc
}

// RecoveryScans 返回找回扫描的会话 runner，外观层只做传递与 DTO 映射。
func (s *SourceService) RecoveryScans() *RecoveryScanRunner {
	return s.recovery
}

// BackfillFingerprints 为库内已可用的文件 Source 补齐指纹。构造函数不再隐藏调度：
// 由装配层（main.go）决定何时在后台启动它。
func (s *SourceService) BackfillFingerprints(ctx context.Context) {
	s.ingest.fingerprints.Backfill(ctx)
}

// SetIndexSync 注入入口集合的对账回调，使增删改 Source 后监听集合能立即重建。
func (s *SourceService) SetIndexSync(h SourceIndexSync) {
	s.indexSync = h
}

// AddSource 为既有 Resource 补充备用入口；补充入口不应意外改变用户当前的首选入口，
// 也不应覆盖用户已维护的资源语义。
//
// 三个变更方法共享同一编排：归一化 → 存在性检查 → 探测 → 写入 → 对账监听 → 回读。
// 存在性检查必须先于探测：URL 探测最多阻塞 10 秒，不能在不存在的目标上白等。
func (s *SourceService) AddSource(ctx context.Context, resourceID string, srcType storage.SourceType, input string) (Source, error) {
	location, err := s.ingest.normalizeInput(input, srcType)
	if err != nil {
		return Source{}, err
	}
	// 归属目标的存在性是产品规则，不依赖外键约束兜底。
	if err := s.requireResource(ctx, resourceID); err != nil {
		return Source{}, err
	}

	outcome := s.ingest.probe(ctx, location, srcType)
	result, err := s.ingest.write(ctx, ingestWrite{
		mode:       ingestAppendSource,
		resourceID: resourceID,
		srcType:    srcType,
		location:   location,
		probe:      outcome,
	})
	if err != nil {
		return Source{}, fmt.Errorf("failed to add %s source: %w", sourceTypeLabel(srcType), err)
	}

	s.resyncIndex(ctx)
	return s.getSource(ctx, result.sourceID)
}

// ReplaceSource 用新输入找回失效入口，保留其身份、顺位与首选角色；它不是同位置刷新。
// 类型由存量行派生：行是类型的权威，替换不会把文件入口变成 URL 入口。
func (s *SourceService) ReplaceSource(ctx context.Context, sourceID string, input string) (Source, error) {
	existing, err := s.getSource(ctx, sourceID)
	if err != nil {
		return Source{}, err
	}
	location, err := s.ingest.normalizeInput(input, existing.Type)
	if err != nil {
		return Source{}, err
	}

	outcome := s.ingest.probe(ctx, location, existing.Type)
	_, err = s.ingest.write(ctx, ingestWrite{
		mode:     ingestReplaceSource,
		sourceID: sourceID,
		srcType:  existing.Type,
		location: location,
		probe:    outcome,
	})
	if err != nil {
		return Source{}, fmt.Errorf("failed to replace source: %w", err)
	}

	s.resyncIndex(ctx)
	return s.getSource(ctx, sourceID)
}

// RefreshSource 仅在用户明确请求时重新检查同一位置的可用性与展示信息，不改变 location，
// 不回写 Resource 标题（AGENTS.md「Resource 标题」）。类型由存量行派生；
// 文件入口可用时同时记录指纹。
func (s *SourceService) RefreshSource(ctx context.Context, sourceID string) (Source, error) {
	src, err := s.getSource(ctx, sourceID)
	if err != nil {
		return Source{}, err
	}

	outcome := s.ingest.probe(ctx, src.Location, src.Type)
	if _, err := s.ingest.write(ctx, ingestWrite{
		mode:     ingestRefreshSource,
		sourceID: sourceID,
		probe:    outcome,
	}); err != nil {
		return Source{}, err
	}

	if src.Type == storage.SourceTypeFile && outcome.available {
		s.ingest.fingerprints.Record(sourceID, src.Location)
	}
	return s.getSource(ctx, sourceID)
}

func sourceTypeLabel(srcType storage.SourceType) string {
	if srcType == storage.SourceTypeURL {
		return "URL"
	}
	return string(srcType)
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
// 返回被删 Source 归属的 ResourceID，供外观层在变更后装配完整资源视图。
func (s *SourceService) RemoveSource(ctx context.Context, sourceID string) (string, error) {
	var resourceID string
	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		src, err := s.sources.Get(ctx, tx, sourceID)
		if err != nil {
			return mapNotFound(err)
		}
		resourceID = src.ResourceID

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
	if err != nil {
		return "", err
	}

	s.resyncIndex(ctx)
	return resourceID, nil
}

// ProbeURLSourceOnOpen 是打开详情时的短预算重新判定：与纳入/手动刷新的 10 秒预算分开，
// 前台交互不能等 10 秒。
//
// 与手动刷新的差别只在三态：Inconclusive（断网、超时、DNS 失败）不落库，保留原值。
// 一次断网不该把整片 URL 资源标成失效。
func (s *SourceService) ProbeURLSourceOnOpen(ctx context.Context, sourceID string) (Source, ProbeOutcome, error) {
	src, err := s.sources.Get(ctx, s.db.SqlDB(), sourceID)
	if err != nil {
		return Source{}, ProbeOutcomeInconclusive, mapNotFound(err)
	}
	if src.Type != storage.SourceTypeURL {
		return Source{}, ProbeOutcomeInconclusive, ErrOnlyURLSourceRefreshable
	}

	fetchCtx, cancel := context.WithTimeout(ctx, probeBudgetOnOpen)
	defer cancel()
	meta, reachability, _ := s.ingest.fetcher.FetchURL(fetchCtx, src.Location)
	outcome := probeOutcomeFrom(reachability)

	if outcome != ProbeOutcomeInconclusive {
		// 探测未取回元数据时保留既有展示信息：打开抽屉不该顺手抹掉已知标题。
		metadataJSON := src.MetadataJSON
		if meta != nil {
			if bytes, err := json.Marshal(meta); err == nil {
				metadataJSON = string(bytes)
			}
		}
		_, err = s.ingest.write(ctx, ingestWrite{
			mode:     ingestRefreshSource,
			sourceID: sourceID,
			probe:    probeOutcome{available: reachability == remote.ReachabilityAvailable, metadataJSON: metadataJSON},
		})
		if err != nil {
			return Source{}, outcome, err
		}
	}

	updated, err := s.getSource(ctx, sourceID)
	return updated, outcome, err
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
