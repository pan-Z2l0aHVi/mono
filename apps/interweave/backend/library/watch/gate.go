package watch

import (
	"context"
	"log"
	"sync"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// AvailabilityGate 是可用性写入的唯一入口：目录监听与媒体 404 兜底都经它落库并发事件，
// 「先落库、后发事件、只在真翻转时发」因此成为 implementation 的属性，而不是每个
// 调用方各自遵守的约定。
//
// 事件出口要等 window 就绪才能确定，所以 emitter 是晚绑定的：未接线时只落库不发事件，
// SetEmitter 之后才开始推送。gate 恒存在，不依赖 fsnotify 是否可用——监听不可用时
// 媒体兜底照常工作（ApplyFileAvailability 只写库与指纹，不依赖监听），只降级目录监听方向。
type AvailabilityGate struct {
	sink AvailabilitySink

	emitMu sync.Mutex
	emit   Emitter
}

// NewAvailabilityGate 用 core 的可用性写入口组装 gate；sink 同时供监听集合对账复用。
func NewAvailabilityGate(sink AvailabilitySink) *AvailabilityGate {
	return &AvailabilityGate{sink: sink}
}

// SetEmitter 晚绑定事件出口；重复接线以最后一次为准。必须在 watcher.Start 之前调用，
// 保住「goroutine 由 Start 在接线后创建」的时序承诺。
func (g *AvailabilityGate) SetEmitter(emit Emitter) {
	g.emitMu.Lock()
	defer g.emitMu.Unlock()
	g.emit = emit
}

// Report 落库一次可用性结论，只在真的翻转且事件出口已接线时发事件。
// flipped 表示库内可用性是否真的翻转；写入失败按降级记日志后原样返回错误。
func (g *AvailabilityGate) Report(ctx context.Context, sourceID string, available bool) (bool, error) {
	change, err := g.sink.ApplyFileAvailability(ctx, sourceID, available)
	if err != nil {
		log.Printf("interweave: apply file availability for %s failed: %v", sourceID, err)
		return false, err
	}
	if change == nil {
		return false, nil
	}
	g.emitMu.Lock()
	emit := g.emit
	g.emitMu.Unlock()
	if emit == nil {
		return true, nil
	}
	emit(*change)
	return true, nil
}

// ReportFileUnavailable 满足 media.AvailabilityReporter：媒体 404 兜底与目录监听
// 共用同一个写入口与发射出口。
func (g *AvailabilityGate) ReportFileUnavailable(ctx context.Context, sourceID string) (bool, error) {
	return g.Report(ctx, sourceID, false)
}

// ListFileSourceLocations 一行委托 sink，使 gate 自身满足 AvailabilitySink、
// NewWatcher 只收 gate 一个参数。
func (g *AvailabilityGate) ListFileSourceLocations(ctx context.Context) ([]string, error) {
	return g.sink.ListFileSourceLocations(ctx)
}

// FileSourceIDsByLocations 同上一行委托，把内核事件路径解析为受影响 Source。
func (g *AvailabilityGate) FileSourceIDsByLocations(ctx context.Context, locations []string) ([]core.SourceLocationRef, error) {
	return g.sink.FileSourceIDsByLocations(ctx, locations)
}
