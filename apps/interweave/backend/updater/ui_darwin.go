//go:build darwin

// cspell:ignore fobjc

package updater

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Cocoa

#include <stdint.h>
#include <stdlib.h>

void iw_updater_panel_render(
    uint64_t sessionID,
    const char *state,
    const char *title,
    const char *message,
    const char *notes,
    int progressPercent,
    int indeterminate,
    int canOpenDownloads
);
void iw_updater_panel_focus(void);
void iw_updater_panel_hide(void);
*/
import "C"

import (
	"sync"
	"unsafe"
)

var (
	darwinPanelMu      sync.RWMutex
	darwinPanelHandler func(UIEvent)
)

//export goUpdaterPanelAction
func goUpdaterPanelAction(sessionID C.uint64_t, action *C.char) {
	kind := UIEventKind(C.GoString(action))
	darwinPanelMu.RLock()
	h := darwinPanelHandler
	darwinPanelMu.RUnlock()
	if h != nil {
		// Controller.SetEventHandler 内部已保证非阻塞投递到带缓冲 channel，绝不阻塞 AppKit 主线程。
		h(UIEvent{SessionID: uint64(sessionID), Kind: kind})
	}
}

type darwinPanelUI struct{}

// NewPlatformUI 返回 macOS 原生 AppKit NSPanel 更新弹窗适配器。
func NewPlatformUI() UIAdapter {
	return &darwinPanelUI{}
}

func (u *darwinPanelUI) SetEventHandler(handler func(UIEvent)) {
	darwinPanelMu.Lock()
	defer darwinPanelMu.Unlock()
	darwinPanelHandler = handler
}

func (u *darwinPanelUI) Render(snap UISnapshot) {
	cState := C.CString(string(snap.State))
	cTitle := C.CString(snap.Title)
	cMsg := C.CString(snap.Message)
	cNotes := C.CString(snap.ReleaseNotes)
	indeterminate := C.int(0)
	if snap.Indeterminate {
		indeterminate = 1
	}
	canOpen := C.int(0)
	if snap.CanOpenDownloads {
		canOpen = 1
	}
	// iw_updater_panel_render 会在复制字符串后 dispatch_async 到主线程，这里同步释放 C 字符串安全。
	C.iw_updater_panel_render(
		C.uint64_t(snap.SessionID),
		cState,
		cTitle,
		cMsg,
		cNotes,
		C.int(snap.ProgressPercent),
		indeterminate,
		canOpen,
	)
	C.free(unsafe.Pointer(cState))
	C.free(unsafe.Pointer(cTitle))
	C.free(unsafe.Pointer(cMsg))
	C.free(unsafe.Pointer(cNotes))
}

func (u *darwinPanelUI) Focus() {
	C.iw_updater_panel_focus()
}

func (u *darwinPanelUI) Hide() {
	C.iw_updater_panel_hide()
}

func (u *darwinPanelUI) Close() {
	C.iw_updater_panel_hide()
}
