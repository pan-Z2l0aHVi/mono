package core

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// ProbeOutcome 是 URL 可用性探测的三态结论。
// remote.Reachability 表达传输层事实，这里是产品层结论：core 负责把前者收敛为后者，
// 使外观层与前端都不必理解 remote 的错误分类。
type ProbeOutcome string

const (
	// 服务端以 2xx/3xx 明确接受。
	ProbeOutcomeAvailable ProbeOutcome = "available"
	// 服务端以 4xx/5xx 明确拒绝。
	ProbeOutcomeUnavailable ProbeOutcome = "unavailable"
	// ProbeOutcomeInconclusive 表示本次无法判定（网络不可达、超时、DNS 失败），
	// 不落库、不改变既有失效角标。
	ProbeOutcomeInconclusive ProbeOutcome = "inconclusive"
)

func probeOutcomeFrom(reachability remote.Reachability) ProbeOutcome {
	switch reachability {
	case remote.ReachabilityAvailable:
		return ProbeOutcomeAvailable
	case remote.ReachabilityUnavailable:
		return ProbeOutcomeUnavailable
	default:
		return ProbeOutcomeInconclusive
	}
}

// SourceIndexSync 是文件可用性监听在 core 侧的窄接缝：core 不感知 fsnotify，
// 只在入口集合变化后请求外部重建监听索引。
type SourceIndexSync interface {
	SyncSources(ctx context.Context) error
}

// AvailabilityChange 是一次实际发生的可用性翻转及其推送载荷。
// 只有写库成功才会产生：事件先于落库不可能发生。
type AvailabilityChange struct {
	SourceID   string
	ResourceID string
	Type       storage.SourceType
	Available  bool
	// SizeBytes 只在翻转的是首选文件 Source 且当前可服务时有值。size 由后端实时
	// stat 派生、不入库，事件带上它可以让前端不必为刷新一个数字再往返一次列表装配。
	SizeBytes *int64
	ChangedAt int64
}

// SourceLocationRef 是按位置反查 Source 得到的最小身份。
type SourceLocationRef struct {
	ID       string
	Location string
}

// ListFileSourceLocations 返回库内全部文件 Source 的位置，供监听集合全量重建。
func (s *SourceService) ListFileSourceLocations(ctx context.Context) ([]string, error) {
	return s.sources.ListFileSourceLocations(ctx, s.db.SqlDB())
}

// FileSourceIDsByLocations 按位置反查文件 Source，把内核事件路径解析为受影响入口。
func (s *SourceService) FileSourceIDsByLocations(ctx context.Context, locations []string) ([]SourceLocationRef, error) {
	models, err := s.sources.ListFileSourcesByLocations(ctx, s.db.SqlDB(), locations)
	if err != nil {
		return nil, err
	}
	refs := make([]SourceLocationRef, 0, len(models))
	for _, model := range models {
		refs = append(refs, SourceLocationRef{ID: model.ID, Location: model.Location})
	}
	return refs, nil
}

// ApplyFileAvailability 是「目录监听」与「媒体请求 404 兜底」共用的唯一可用性写入口。
// 仅在可用性实际翻转时写库并返回该次翻转的载荷（nil 表示无变化）；其余情况是幂等 no-op。
func (s *SourceService) ApplyFileAvailability(ctx context.Context, sourceID string, available bool) (*AvailabilityChange, error) {
	now := time.Now().UnixMilli()
	var change *AvailabilityChange
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 读在事务内：与手动刷新的比较-写入保持原子，不丢更新。
		src, err := s.sources.Get(ctx, tx, sourceID)
		if err != nil {
			return mapNotFound(err)
		}
		if src.Type != storage.SourceTypeFile {
			return ErrOnlyFileSourceRefreshable
		}
		if src.Available == available {
			// 幂等：既不写 updated_at 也不发事件，否则每次文件写入事件都会刷新时间戳，
			// 搅乱列表按 created_at 的排序。
			return nil
		}
		if err := s.sources.UpdateAvailability(ctx, tx, sourceID, available, src.MetadataJSON, now); err != nil {
			return mapNotFound(err)
		}
		change = &AvailabilityChange{
			SourceID:   src.ID,
			ResourceID: src.ResourceID,
			Type:       src.Type,
			Available:  available,
			ChangedAt:  now,
		}
		if servable, size := ProbeFileServable(src.Location); src.IsPreferred && available && servable {
			change.SizeBytes = size
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, ErrSourceNotFound) {
			// 源已被删除不是错误：移除 Resource 会级联删掉它的 Source。
			return nil, nil
		}
		return nil, err
	}
	return change, nil
}

// ProbeFileServable 判定文件入口当前是否可服务并取回字节数，是文件可用性监听
// 与媒体 404 兜底共用的判定口径。
// 「必须是常规文件」与媒体读取路径、视图装配的 size 派生共用同一判据：
// stat 成功但路径是目录或管道时媒体请求必然无法服务，不能算作可用。
func ProbeFileServable(location string) (bool, *int64) {
	info, err := os.Stat(location)
	if err != nil || !info.Mode().IsRegular() {
		return false, nil
	}
	size := info.Size()
	return true, &size
}

// FileDefinitelyUnavailable 把一次 stat 结果翻译成「文件确实不可服务」。
// 调用方必须区分「内容不可服务」与「此刻读不到」：权限与 I/O 错误无从判断文件是否存在，
// 误判成失效会让 macOS TCC 拒绝访问把整片资源库标成失效。
func FileDefinitelyUnavailable(err error, info os.FileInfo) bool {
	if err != nil {
		return errors.Is(err, os.ErrNotExist)
	}
	return info != nil && !info.Mode().IsRegular()
}

// resyncIndex 在入口集合变化后请求监听重建。对账失败不回滚已提交的事务：
// 文件已经入库，缺的是监听索引而不是库内记录，下一次对账会补上。
func (s *SourceService) resyncIndex(ctx context.Context) {
	if s.indexSync == nil {
		return
	}
	_ = s.indexSync.SyncSources(ctx)
}
