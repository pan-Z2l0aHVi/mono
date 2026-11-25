package main

import (
	"sync"

	"github.com/wailsapp/wails/v3/pkg/services/dock"
)

// dockIconService 只取 Wails Dock service 的图标可见性能力，便于在单测中用 fake 替代。
type dockIconService interface {
	HideAppIcon()
	ShowAppIcon()
}

var _ dockIconService = (*dock.DockService)(nil)

// serialDispatcher 按提交顺序串行执行任务，submit 只入队不等待任务完成。
// 任务内部可能 dispatch_sync 回 Wails main queue，而托盘左键回调本身就在 main queue，
// 所以绝不能在调用方同步执行。无界 FIFO 取代固定 channel：队列满时若退化成裸 goroutine，
// hide/show 会乱序，Dock 图标与实际窗口状态就会失配。
type serialDispatcher struct {
	mu     sync.Mutex
	cond   *sync.Cond
	queue  []func()
	closed bool
	done   chan struct{}
}

func newSerialDispatcher() *serialDispatcher {
	d := &serialDispatcher{done: make(chan struct{})}
	d.cond = sync.NewCond(&d.mu)
	go d.run()
	return d
}

func (d *serialDispatcher) submit(fn func()) {
	if fn == nil {
		return
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.closed {
		return
	}
	d.queue = append(d.queue, fn)
	d.cond.Signal()
}

func (d *serialDispatcher) run() {
	defer close(d.done)
	for {
		d.mu.Lock()
		for len(d.queue) == 0 && !d.closed {
			d.cond.Wait()
		}
		if d.closed && len(d.queue) == 0 {
			d.mu.Unlock()
			return
		}
		fn := d.queue[0]
		d.queue[0] = nil
		d.queue = d.queue[1:]
		d.mu.Unlock()
		fn()
	}
}

// shutdown 停止接收新任务，并返回 worker 处理完已入队任务的信号。
// 调用方可以在别的线程上等这个信号做收尾；不能在主线程等——Dock service
// 的 dispatch_sync 也依赖 main queue，主线程自等会死锁。
func (d *serialDispatcher) shutdown() <-chan struct{} {
	d.mu.Lock()
	d.closed = true
	d.cond.Broadcast()
	d.mu.Unlock()
	return d.done
}

// platformDockPresence 把「无窗口时隐藏 Dock、恢复窗口时显示 Dock」限制在 macOS。
// 与 cc-switch 一致：关闭到托盘时切到 Accessory，托盘或 Dock 恢复窗口时切回 Regular；
// Windows/Linux 的 Dock service 对这两个调用是 no-op，不影响任务栏图标。
//
// Wails 的 macOS Dock service 内部直接 dispatch_sync 到 main queue，没有主线程判断；
// 托盘左键回调本身就在 main queue，同步调用会触发同队列 dispatch_sync 死锁而闪退。
// 因此调用先交给串行 worker，由 worker 在非主线程调用 service，service 再安全切回主线程。
type platformDockPresence struct {
	goos string
	dock dockIconService
	// run 默认非阻塞投递到串行 worker；单测替换为同步执行以直接断言委派结果。
	run        func(func())
	dispatcher *serialDispatcher
}

func newPlatformDockPresence(goos string, service dockIconService) *platformDockPresence {
	p := &platformDockPresence{goos: goos, dock: service}
	p.dispatcher = newSerialDispatcher()
	p.run = p.dispatcher.submit
	return p
}

// shutdown 停止后台 worker，返回它处理完已入队任务的信号。
// Wails 的 OnShutdown 在 main thread 执行，这里只发信号不等待；需要确认最后一次
// Dock 状态已提交时，由非主线程等返回的 channel。
func (p *platformDockPresence) shutdown() <-chan struct{} {
	if p != nil && p.dispatcher != nil {
		return p.dispatcher.shutdown()
	}
	done := make(chan struct{})
	close(done)
	return done
}

// quitAfterDrain 在退出前排空已提交的 Dock 调用，再从后台线程触发退出。
// 退出触发器会在 Wails 主线程执行，不能在主线程直接等 done：Dock service 的
// dispatch_sync 也依赖 main queue，自等会死锁。
func (p *platformDockPresence) quitAfterDrain(quit func()) {
	done := p.shutdown()
	go func() {
		<-done
		if quit != nil {
			quit()
		}
	}()
}

func (p *platformDockPresence) apply(call func()) {
	if p == nil || p.goos != "darwin" || p.dock == nil {
		return
	}
	if p.run != nil {
		p.run(call)
		return
	}
	go call()
}

func (p *platformDockPresence) hide() {
	p.apply(func() { p.dock.HideAppIcon() })
}

func (p *platformDockPresence) show() {
	p.apply(func() { p.dock.ShowAppIcon() })
}
