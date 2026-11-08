package watch

import (
	"context"
	"errors"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// fakeGateSink 允许单测注入 apply 错误并记录调用顺序，验证 gate 的落库/发射不变量。
type fakeGateSink struct {
	applyErr error
	change   *core.AvailabilityChange

	// calls 按发生顺序记录 "apply" / "emit"，证明先落库后发事件。
	calls []string
}

func (s *fakeGateSink) ApplyFileAvailability(context.Context, string, bool) (*core.AvailabilityChange, error) {
	s.calls = append(s.calls, "apply")
	return s.change, s.applyErr
}

func (s *fakeGateSink) ListFileSourceLocations(context.Context) ([]string, error) {
	return nil, nil
}

func (s *fakeGateSink) FileSourceIDsByLocations(context.Context, []string) ([]core.SourceLocationRef, error) {
	return nil, nil
}

// gate 的契约表：{apply 出错, 未翻转, 翻转但 emit 未接线, 翻转且已接线} →
// {是否发事件, flipped, err}。「先落库、后发事件、只在真翻转时发」在这里逐行钉死。
func TestAvailabilityGateReport(t *testing.T) {
	flipped := &core.AvailabilityChange{SourceID: "s1", Available: true}

	tests := []struct {
		name      string
		applyErr  error
		change    *core.AvailabilityChange
		wire      bool
		wantEmit  int
		wantFlip  bool
		wantError bool
	}{
		{name: "apply 失败：不翻转不发事件，错误原样上抛", applyErr: errors.New("db down"), wantEmit: 0, wantFlip: false, wantError: true},
		{name: "未翻转：静默 no-op", change: nil, wantEmit: 0, wantFlip: false, wantError: false},
		{name: "翻转但 emit 未接线：只落库不发事件", change: flipped, wire: false, wantEmit: 0, wantFlip: true, wantError: false},
		{name: "翻转且已接线：恰好发一次", change: flipped, wire: true, wantEmit: 1, wantFlip: true, wantError: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sink := &fakeGateSink{applyErr: tt.applyErr, change: tt.change}
			gate := NewAvailabilityGate(sink)
			emitted := 0
			if tt.wire {
				gate.SetEmitter(func(core.AvailabilityChange) { emitted++ })
			}

			got, err := gate.Report(context.Background(), "s1", true)

			if emitted != tt.wantEmit {
				t.Errorf("expected %d emits, got %d", tt.wantEmit, emitted)
			}
			if got != tt.wantFlip {
				t.Errorf("expected flipped=%v, got %v", tt.wantFlip, got)
			}
			if (err != nil) != tt.wantError {
				t.Errorf("expected error presence %v, got %v", tt.wantError, err)
			}
		})
	}
}

// 顺序不变量：emit 只能发生在 apply 之后，且只在真翻转时发生。
func TestAvailabilityGateEmitsAfterApply(t *testing.T) {
	sink := &fakeGateSink{change: &core.AvailabilityChange{SourceID: "s1"}}
	gate := NewAvailabilityGate(sink)
	gate.SetEmitter(func(core.AvailabilityChange) { sink.calls = append(sink.calls, "emit") })

	if _, err := gate.Report(context.Background(), "s1", true); err != nil {
		t.Fatalf("Report error: %v", err)
	}
	if len(sink.calls) != 2 || sink.calls[0] != "apply" || sink.calls[1] != "emit" {
		t.Fatalf("expected apply before emit, got %v", sink.calls)
	}
}

// ReportFileUnavailable 是 media.AvailabilityReporter 的一行适配：固定向不可用方向写。
func TestAvailabilityGateReportFileUnavailable(t *testing.T) {
	sink := &fakeGateSink{change: &core.AvailabilityChange{SourceID: "s1", Available: false}}
	gate := NewAvailabilityGate(sink)

	flipped, err := gate.ReportFileUnavailable(context.Background(), "s1")
	if err != nil || !flipped {
		t.Fatalf("expected a real flip, got flipped=%v err=%v", flipped, err)
	}
	if len(sink.calls) != 1 {
		t.Fatalf("expected exactly one apply call, got %v", sink.calls)
	}
}
