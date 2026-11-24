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
// 只在入口集合变化后非阻塞地请求外部重建监听索引。
type SourceIndexSync interface {
	RequestSync()
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
func (s *Library) ListFileSourceLocations(ctx context.Context) ([]string, error) {
	return s.sources.ListFileSourceLocations(ctx, s.db.SqlDB())
}

// FileSourceIDsByLocations 按位置反查文件 Source，把内核事件路径解析为受影响入口。
func (s *Library) FileSourceIDsByLocations(ctx context.Context, locations []string) ([]SourceLocationRef, error) {
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
// 只在可用性真的翻转时写 availability 并返回该次翻转的载荷（nil 表示无变化）。
// 但 `available=true` 的调用每次都会 refresh 一遍 source_fingerprints 的幂等 upsert：
// 文件可用时属性可能已经变了，扫描要靠这份指纹认定身份与内容，所以这条路径不是无 IO 的 no-op。
func (s *Library) ApplyFileAvailability(ctx context.Context, sourceID string, available bool) (*AvailabilityChange, error) {
	now := time.Now().UnixMilli()
	var change *AvailabilityChange
	var fileLocation string
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 读在事务内：与手动刷新的比较-写入保持原子，不丢更新。
		src, err := s.sources.Get(ctx, tx, sourceID)
		if err != nil {
			return mapNotFound(err)
		}
		if src.Type != storage.SourceTypeFile {
			return ErrOnlyFileSourceRefreshable
		}
		fileLocation = src.Location
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
		if verdict, size := ProbeFileServability(src.Location); src.IsPreferred && available && verdict == FileServable {
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
	if available && fileLocation != "" {
		s.ingest.fingerprints.Record(sourceID, fileLocation)
	}
	return change, nil
}

// FileServability 是「文件入口此刻能否服务」的三态结论。
// 纳入探测、目录监听、媒体读取、视图装配与 pending 预览共用这一口径。
type FileServability int

const (
	// FileServable：常规文件，可服务。
	FileServable FileServability = iota
	// FileDefinitelyUnavailable：不存在，或 stat 到目录/管道等非常规文件，可放心判失效。
	FileDefinitelyUnavailable
	// FileInconclusive：权限与 I/O 错误，无从判断文件是否存在，
	// 不得据此翻转可用性（误判会让 macOS TCC 拒绝访问把整片资源库标成失效）。
	FileInconclusive
)

// ClassifyFileStat 是纯分类器：把一次 stat 结果翻译成三态结论。
// 媒体读取路径的 statFile 注入点复用它，因此测试可以不碰真实文件系统。
func ClassifyFileStat(err error, info os.FileInfo) FileServability {
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return FileDefinitelyUnavailable
		}
		return FileInconclusive
	}
	if info == nil || !info.Mode().IsRegular() {
		return FileDefinitelyUnavailable
	}
	return FileServable
}

// ProbeFileServability stat 一次 location 并返回三态结论；仅 FileServable 时带回字节数。
func ProbeFileServability(location string) (FileServability, *int64) {
	info, err := os.Stat(location)
	verdict := ClassifyFileStat(err, info)
	if verdict != FileServable {
		return verdict, nil
	}
	size := info.Size()
	return verdict, &size
}

// resyncIndex 在入口集合变化后非阻塞地请求监听重建：
