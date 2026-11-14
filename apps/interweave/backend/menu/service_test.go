package menu

import (
	"context"
	"testing"
)

// 上报禁用集合会触发菜单重建，所以「集合没变就不重建」是承重的行为：
// 路由与历史栈变化时前端可能频繁上报，重建在 Windows 上是一次 SetMenu + DrawMenuBar。
func TestReportDisabledCommandsRebuildsOnlyWhenTheSetChanges(t *testing.T) {
	service := NewService()
	calls := 0
	service.SetChangeHandler(func() { calls++ })

	service.ReportDisabledCommands(context.Background(), []Command{CommandFocusSearch, CommandNavigateBack})
	if calls != 1 {
		t.Fatalf("expected one rebuild after the first report, got %d", calls)
	}

	// 同一集合换个顺序：内容没变，不是新状态。
	service.ReportDisabledCommands(context.Background(), []Command{CommandNavigateBack, CommandFocusSearch})
	if calls != 1 {
		t.Fatalf("expected a reordered report to skip the rebuild, got %d calls", calls)
	}

	service.ReportDisabledCommands(context.Background(), []Command{CommandFocusSearch})
	if calls != 2 {
		t.Fatalf("expected a changed set to rebuild, got %d calls", calls)
	}

	service.ReportDisabledCommands(context.Background(), nil)
	if calls != 3 {
		t.Fatalf("expected an empty report to rebuild, got %d calls", calls)
	}
}

func TestReportDisabledCommandsIgnoresUnknownCommands(t *testing.T) {
	service := NewService()
	service.ReportDisabledCommands(context.Background(), []Command{"not-a-command", CommandToggleFilterBar})

	disabled := service.DisabledCommands()
	if len(disabled) != 1 || disabled[0] != CommandToggleFilterBar {
		t.Fatalf("expected only the known command to be stored, got %v", disabled)
	}
	if service.IsDisabled("not-a-command") {
		t.Fatal("expected an unknown command to stay out of the disabled set")
	}
}

// 取消的请求不落状态也不触发重建：请求方已经走了，这次上报没有意义。
func TestReportDisabledCommandsHonoursCancellation(t *testing.T) {
	service := NewService()
	calls := 0
	service.SetChangeHandler(func() { calls++ })

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	service.ReportDisabledCommands(ctx, []Command{CommandFocusSearch})

	if calls != 0 {
		t.Fatalf("expected no rebuild for a cancelled report, got %d", calls)
	}
	if service.IsDisabled(CommandFocusSearch) {
		t.Fatal("expected a cancelled report to leave the state untouched")
	}
}

// 重建触发器读的是同一把锁保护的状态；持锁回调会在这里直接死锁。
func TestChangeHandlerCanReadStateBack(t *testing.T) {
	service := NewService()
	service.SetChangeHandler(func() {
		if !service.IsDisabled(CommandNavigateForward) {
			t.Errorf("expected the handler to observe the committed set")
		}
	})
	service.ReportDisabledCommands(context.Background(), []Command{CommandNavigateForward})
}

func TestDisabledCommandsReturnsACopy(t *testing.T) {
	service := NewService()
	service.ReportDisabledCommands(context.Background(), []Command{CommandFocusSearch})

	first := service.DisabledCommands()
	first[0] = CommandNavigateBack

	if !service.IsDisabled(CommandFocusSearch) {
		t.Fatal("expected the service state to survive a mutation of the returned slice")
	}
}
