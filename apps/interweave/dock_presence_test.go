package main

import (
	"testing"
	"time"
)

type stubDockIconService struct {
	hidden int
	shown  int
}

func (s *stubDockIconService) HideAppIcon() { s.hidden++ }
func (s *stubDockIconService) ShowAppIcon() { s.shown++ }

// cleanupDockPresence 在测试结束（含提前失败）时排空未读的 Dock 调用，
// 让 worker 不会被 channel 发送卡住；shutdown 返回完成信号，不在清理里盲等。
func cleanupDockPresence(t *testing.T, presence *platformDockPresence, calls <-chan string) {
	t.Helper()
	t.Cleanup(func() {
		done := presence.shutdown()
		for {
			select {
			case <-calls:
			case <-done:
				return
			}
		}
	})
}

func synchronousDockPresence(t *testing.T, goos string, service dockIconService) *platformDockPresence {
	t.Helper()
	p := newPlatformDockPresence(goos, service)
	t.Cleanup(func() { <-p.shutdown() })
	// 单测把后台派发换成直接调用，便于同步断言；生产路径仍走 worker，
	// 避免 Wails macOS dock service 的 dispatch_sync 在 main queue 上自锁。
	p.run = func(fn func()) { fn() }
	return p
}

type blockingDockIconService struct {
	calls chan string
}

func (s *blockingDockIconService) HideAppIcon() { s.calls <- "hide" }
func (s *blockingDockIconService) ShowAppIcon() { s.calls <- "show" }

func TestPlatformDockPresenceDispatchesAsynchronouslyInOrder(t *testing.T) {
	// Wails 的 dock service 在 macOS 上同步派回 main queue；托盘左键回调已在 main queue，
	// 同步调用会触发 libdispatch 陷阱。这里确保调用方先返回，且 worker 按序执行 hide/show。
	dock := &blockingDockIconService{calls: make(chan string, 2)}
	presence := newPlatformDockPresence("darwin", dock)
	cleanupDockPresence(t, presence, dock.calls)

	returned := make(chan struct{})
	go func() {
		presence.hide()
		presence.show()
		close(returned)
	}()

	select {
	case <-returned:
	case <-time.After(time.Second):
		t.Fatal("dock calls blocked the caller")
	}
	for _, want := range []string{"hide", "show"} {
		select {
		case got := <-dock.calls:
			if got != want {
				t.Fatalf("expected %q, got %q", want, got)
			}
		case <-time.After(time.Second):
			t.Fatalf("background dock call %q never happened", want)
		}
	}
}

func TestPlatformDockPresenceKeepsOrderUnderBackpressure(t *testing.T) {
	// worker 被 unbuffered channel 阻塞时，后续命令必须继续排队而不是退化成裸 goroutine；
	// 否则后提交的 show 可能先于先提交的 hide 执行，Dock 状态就与窗口状态反了。
	// 只缓冲一次发送：worker 会卡在第二次发送上，后续命令必须进 FIFO 队列；
	// 测试提前失败时由 cleanupDockPresence 排空，worker 不会泄漏。
	dock := &blockingDockIconService{calls: make(chan string, 1)}
	presence := newPlatformDockPresence("darwin", dock)
	cleanupDockPresence(t, presence, dock.calls)

	const total = 48
	want := make([]string, total)
	for i := range want {
		if i%2 == 0 {
			want[i] = "hide"
		} else {
			want[i] = "show"
		}
	}

	submitted := make(chan struct{})
	go func() {
		for _, call := range want {
			if call == "hide" {
				presence.hide()
			} else {
				presence.show()
			}
		}
		close(submitted)
	}()
	select {
	case <-submitted:
	case <-time.After(time.Second):
		t.Fatal("submitting dock commands blocked on the busy worker")
	}
	for i, expected := range want {
		select {
		case got := <-dock.calls:
			if got != expected {
				t.Fatalf("call %d: expected %q, got %q", i, expected, got)
			}
		case <-time.After(time.Second):
			t.Fatalf("background dock call %d (%q) never happened", i, expected)
		}
	}
}

func TestPlatformDockPresenceShutdownSignalsAfterQueuedCalls(t *testing.T) {
	dock := &blockingDockIconService{calls: make(chan string)}
	presence := newPlatformDockPresence("darwin", dock)
	cleanupDockPresence(t, presence, dock.calls)

	presence.hide()
	done := presence.shutdown()
	// worker 卡在未读的 channel 发送上，完成信号必须先不成立。
	select {
	case <-done:
		t.Fatal("shutdown completed before the queued dock call was submitted")
	default:
	}
	select {
	case got := <-dock.calls:
		if got != "hide" {
			t.Fatalf("expected %q, got %q", "hide", got)
		}
	case <-time.After(time.Second):
		t.Fatal("queued dock call was never submitted")
	}
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("shutdown did not complete after the queued call")
	}
}

func TestPlatformDockPresenceQuitAfterDrain(t *testing.T) {
	dock := &blockingDockIconService{calls: make(chan string)}
	presence := newPlatformDockPresence("darwin", dock)
	cleanupDockPresence(t, presence, dock.calls)

	quit := make(chan struct{})
	presence.hide()
	presence.quitAfterDrain(func() { close(quit) })
	// 退出触发器必须等 worker 把已提交的 hide 真正交给 Dock service。
	select {
	case <-quit:
		t.Fatal("quit fired before the queued dock call was submitted")
	default:
	}
	select {
	case got := <-dock.calls:
		if got != "hide" {
			t.Fatalf("expected %q, got %q", "hide", got)
		}
	case <-time.After(time.Second):
		t.Fatal("queued dock call was never submitted")
	}
	select {
	case <-quit:
	case <-time.After(time.Second):
		t.Fatal("quit did not fire after the queued call")
	}
}

func TestPlatformDockPresence(t *testing.T) {
	macDock := &stubDockIconService{}
	mac := synchronousDockPresence(t, "darwin", macDock)
	mac.hide()
	mac.show()
	if macDock.hidden != 1 || macDock.shown != 1 {
		t.Fatalf("macOS should delegate both icon visibility changes, got hidden=%d shown=%d", macDock.hidden, macDock.shown)
	}

	for _, goos := range []string{"windows", "linux"} {
		otherDock := &stubDockIconService{}
		other := synchronousDockPresence(t, goos, otherDock)
		other.hide()
		other.show()
		if otherDock.hidden != 0 || otherDock.shown != 0 {
			t.Fatalf("%s should leave taskbar icon alone, got hidden=%d shown=%d", goos, otherDock.hidden, otherDock.shown)
		}
	}

	var nilPresence *platformDockPresence
	nilPresence.hide()
	nilPresence.show()
	synchronousDockPresence(t, "darwin", nil).hide()
	synchronousDockPresence(t, "darwin", nil).show()
}
