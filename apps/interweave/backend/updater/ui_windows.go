//go:build windows

// cspell:ignore comctl ASFW

package updater

import (
	"fmt"
	"runtime"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	// TaskDialog flags
	tdfEnableHyperlinks        uint32 = 0x0001
	tdfAllowDialogCancellation uint32 = 0x0008
	tdfShowProgressBar         uint32 = 0x0200
	tdfShowMarqueeProgressBar  uint32 = 0x0400
	tdfCallbackTimer           uint32 = 0x0800
	tdfPositionRelativeToWin   uint32 = 0x1000

	// TaskDialog notifications
	tdnCreated           uint32 = 0
	tdnNavigated         uint32 = 1
	tdnButtonClicked     uint32 = 2
	tdnHyperlinkClicked  uint32 = 3
	tdnTimer             uint32 = 4
	tdnDestroyed         uint32 = 5
	tdnDialogConstructed uint32 = 7

	// TaskDialog messages (WM_USER + offset)
	wmUser                   uint32 = 0x0400
	tdmNavigatePage          uint32 = wmUser + 101
	tdmClickButton           uint32 = wmUser + 102
	tdmSetMarqueeProgressBar uint32 = wmUser + 103
	tdmSetProgressBarState   uint32 = wmUser + 104
	tdmSetProgressBarRange   uint32 = wmUser + 105
	tdmSetProgressBarPos     uint32 = wmUser + 106
	tdmSetProgressBarMarquee uint32 = wmUser + 107
	tdmUpdateElementText     uint32 = wmUser + 114

	tdeContent uint32 = 0

	// Custom button IDs
	idCancel         int32 = 2
	btnInstallUpdate int32 = 1001
	btnLater         int32 = 1002
	btnRestartNow    int32 = 1003
	btnOpenReleases  int32 = 1004
	btnOK            int32 = 1005

	swRestore = 9
)

var (
	comctl32                = windows.NewLazySystemDLL("comctl32.dll")
	user32                  = windows.NewLazySystemDLL("user32.dll")
	procTaskDialogIndirect  = comctl32.NewProc("TaskDialogIndirect")
	procSendMessageW        = user32.NewProc("SendMessageW")
	procPostMessageW        = user32.NewProc("PostMessageW")
	procShowWindow          = user32.NewProc("ShowWindow")
	procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
	procAllowSetForeground  = user32.NewProc("AllowSetForegroundWindow")
	procGetCurrentThreadID  = windows.NewLazySystemDLL("kernel32.dll").NewProc("GetCurrentThreadId")
)

type windowsTaskDialogUI struct {
	mu           sync.Mutex
	handler      func(UIEvent)
	latest       UISnapshot
	rendered     UISnapshot
	hasSnapshot  bool
	wantClose    bool
	running      bool
	hwnd         uintptr
	doneCh       chan struct{}
	callbackPtr  uintptr
	pinnedBufs   [][]uint16
	pinnedBytes  [][]byte
	activeDialog *windowsTaskDialogUI
}

// NewPlatformUI 返回 Windows 原生 TaskDialogIndirect 更新弹窗适配器。
func NewPlatformUI() UIAdapter {
	ui := &windowsTaskDialogUI{}
	ui.callbackPtr = syscall.NewCallback(ui.dialogCallback)
	return ui
}

func (u *windowsTaskDialogUI) SetEventHandler(handler func(UIEvent)) {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.handler = handler
}

func (u *windowsTaskDialogUI) Render(snapshot UISnapshot) {
	u.mu.Lock()
	u.latest = snapshot
	u.hasSnapshot = true
	u.wantClose = false
	needStart := !u.running
	if needStart {
		u.running = true
		u.doneCh = make(chan struct{})
	}
	u.mu.Unlock()

	if needStart {
		go u.runDialogThread()
	}
}

func (u *windowsTaskDialogUI) Focus() {
	u.mu.Lock()
	hwnd := u.hwnd
	u.mu.Unlock()
	if hwnd != 0 {
		_, _, _ = procAllowSetForeground.Call(^uintptr(0)) // ASFW_ANY
		_, _, _ = procShowWindow.Call(hwnd, swRestore)
		_, _, _ = procSetForegroundWindow.Call(hwnd)
	}
}

func (u *windowsTaskDialogUI) Hide() {
	u.mu.Lock()
	u.wantClose = true
	hwnd := u.hwnd
	u.mu.Unlock()
	if hwnd != 0 {
		_, _, _ = procPostMessageW.Call(hwnd, uintptr(tdmClickButton), uintptr(idCancel), 0)
	}
}

func (u *windowsTaskDialogUI) Close() {
	u.mu.Lock()
	u.wantClose = true
	hwnd := u.hwnd
	done := u.doneCh
	running := u.running
	u.mu.Unlock()

	if hwnd != 0 {
		_, _, _ = procPostMessageW.Call(hwnd, uintptr(tdmClickButton), uintptr(idCancel), 0)
	}
	if running && done != nil {
		<-done
	}
}

func (u *windowsTaskDialogUI) runDialogThread() {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	defer func() {
		u.mu.Lock()
		u.running = false
		u.hwnd = 0
		u.pinnedBufs = nil
		u.pinnedBytes = nil
		done := u.doneCh
		u.mu.Unlock()
		if done != nil {
			close(done)
		}
	}()

	u.mu.Lock()
	snap := u.latest
	u.rendered = snap
	u.mu.Unlock()

	cfgBytes, bufs, rawBytes := u.buildPackedConfig(snap)
	u.mu.Lock()
	u.pinnedBufs = bufs
	u.pinnedBytes = rawBytes
	u.mu.Unlock()

	var buttonPressed int32
	_, _, _ = procTaskDialogIndirect.Call(
		uintptr(unsafe.Pointer(&cfgBytes[0])),
		uintptr(unsafe.Pointer(&buttonPressed)),
		0,
		0,
	)
	runtime.KeepAlive(cfgBytes)
	runtime.KeepAlive(bufs)
	runtime.KeepAlive(rawBytes)
}

func (u *windowsTaskDialogUI) dialogCallback(hwnd uintptr, msg uint32, wParam uintptr, lParam uintptr, refData uintptr) uintptr {
	switch msg {
	case tdnDialogConstructed, tdnCreated:
		u.mu.Lock()
		u.hwnd = hwnd
		snap := u.rendered
		u.mu.Unlock()
		u.applyProgressToDialog(hwnd, snap)
	case tdnNavigated:
		u.mu.Lock()
		snap := u.rendered
		u.mu.Unlock()
		u.applyProgressToDialog(hwnd, snap)
	case tdnTimer:
		u.mu.Lock()
		if u.wantClose {
			u.mu.Unlock()
			_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmClickButton), uintptr(idCancel), 0)
			return 0
		}
		latest := u.latest
		prev := u.rendered
		if !u.hasSnapshot || (latest.SessionID == prev.SessionID && latest.State == prev.State && latest.ProgressPercent == prev.ProgressPercent && latest.Message == prev.Message) {
			u.mu.Unlock()
			return 0
		}
		needNavigate := latest.SessionID != prev.SessionID || latest.State != prev.State
		u.rendered = latest
		u.mu.Unlock()

		if needNavigate {
			cfgBytes, bufs, rawBytes := u.buildPackedConfig(latest)
			u.mu.Lock()
			u.pinnedBufs = bufs
			u.pinnedBytes = rawBytes
			u.mu.Unlock()
			_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmNavigatePage), 0, uintptr(unsafe.Pointer(&cfgBytes[0])))
			runtime.KeepAlive(cfgBytes)
			runtime.KeepAlive(bufs)
			runtime.KeepAlive(rawBytes)
		} else {
			u.applyProgressToDialog(hwnd, latest)
			if contentUTF16, err := windows.UTF16PtrFromString(buildWindowsContent(latest)); err == nil {
				_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmUpdateElementText), uintptr(tdeContent), uintptr(unsafe.Pointer(contentUTF16)))
			}
		}
	case tdnHyperlinkClicked:
		u.emitEvent(EventOpenReleases)
	case tdnButtonClicked:
		btn := int32(wParam)
		switch btn {
		case btnInstallUpdate:
			u.emitEvent(EventInstallUpdate)
			return 1 // S_FALSE: 阻止关闭弹窗，由状态机驱动切换到下载页
		case btnRestartNow:
			u.emitEvent(EventRestartAndInstall)
			return 1
		case btnOpenReleases:
			u.emitEvent(EventOpenReleases)
			return 1
		case btnLater:
			u.emitEvent(EventLater)
			return 0
		case btnOK:
			u.emitEvent(EventClose)
			return 0
		case idCancel:
			u.mu.Lock()
			closingByHide := u.wantClose
			u.mu.Unlock()
			if !closingByHide {
				u.emitEvent(EventCancel)
			}
			return 0
		}
	case tdnDestroyed:
		u.mu.Lock()
		u.hwnd = 0
		u.mu.Unlock()
	}
	return 0
}

func (u *windowsTaskDialogUI) applyProgressToDialog(hwnd uintptr, snap UISnapshot) {
	if snap.State != StateChecking && snap.State != StateDownloading && snap.State != StateInstalling {
		return
	}
	if snap.Indeterminate {
		_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmSetMarqueeProgressBar), 1, 0)
		_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmSetProgressBarMarquee), 1, 30)
		return
	}
	_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmSetMarqueeProgressBar), 0, 0)
	_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmSetProgressBarRange), 0, uintptr(100<<16))
	_, _, _ = procSendMessageW.Call(hwnd, uintptr(tdmSetProgressBarPos), uintptr(snap.ProgressPercent), 0)
}

func (u *windowsTaskDialogUI) emitEvent(kind UIEventKind) {
	u.mu.Lock()
	h := u.handler
	sid := u.rendered.SessionID
	u.mu.Unlock()
	if h != nil {
		h(UIEvent{SessionID: sid, Kind: kind})
	}
}

func (u *windowsTaskDialogUI) buildPackedConfig(snap UISnapshot) ([taskDialogConfigSizeAMD64]byte, [][]uint16, [][]byte) {
	var bufs [][]uint16
	var rawBytes [][]byte

	pinStr := func(s string) uintptr {
		if s == "" {
			return 0
		}
		u16, err := windows.UTF16FromString(s)
		if err != nil || len(u16) == 0 {
			return 0
		}
		bufs = append(bufs, u16)
		return uintptr(unsafe.Pointer(&u16[0]))
	}

	flags := tdfAllowDialogCancellation | tdfCallbackTimer | tdfEnableHyperlinks | tdfPositionRelativeToWin
	if snap.State == StateChecking || snap.State == StateDownloading || snap.State == StateInstalling {
		if snap.Indeterminate {
			flags |= tdfShowMarqueeProgressBar
		} else {
			flags |= tdfShowProgressBar
		}
	}

	var btnSpecs []taskDialogButtonSpec
	var defaultBtn int32 = idCancel
	switch snap.State {
	case StateChecking, StateDownloading, StateInstalling:
		btnSpecs = []taskDialogButtonSpec{
			{ButtonID: idCancel, ButtonText: pinStr("取消")},
		}
		defaultBtn = idCancel
	case StateUpToDate:
		btnSpecs = []taskDialogButtonSpec{
			{ButtonID: btnOK, ButtonText: pinStr("好")},
		}
		defaultBtn = btnOK
	case StateAvailable:
		btnSpecs = []taskDialogButtonSpec{
			{ButtonID: btnInstallUpdate, ButtonText: pinStr("安装更新")},
			{ButtonID: btnLater, ButtonText: pinStr("稍后")},
		}
		defaultBtn = btnInstallUpdate
	case StateReadyToInstall:
		btnSpecs = []taskDialogButtonSpec{
			{ButtonID: btnRestartNow, ButtonText: pinStr("安装并重启")},
			{ButtonID: btnLater, ButtonText: pinStr("稍后")},
		}
		defaultBtn = btnRestartNow
	case StateError:
		if snap.CanOpenDownloads {
			btnSpecs = append(btnSpecs, taskDialogButtonSpec{ButtonID: btnOpenReleases, ButtonText: pinStr("打开下载页")})
		}
		btnSpecs = append(btnSpecs, taskDialogButtonSpec{ButtonID: btnOK, ButtonText: pinStr("关闭")})
		defaultBtn = btnOK
	}

	var buttonsPtr uintptr
	if packedBtns := packTaskDialogButtonsAMD64(btnSpecs); len(packedBtns) > 0 {
		rawBytes = append(rawBytes, packedBtns)
		buttonsPtr = uintptr(unsafe.Pointer(&packedBtns[0]))
	}

	spec := taskDialogConfigSpec{
		Flags:           flags,
		WindowTitle:     pinStr("软件更新"),
		MainInstruction: pinStr(snap.Title),
		Content:         pinStr(buildWindowsContent(snap)),
		ButtonCount:     uint32(len(btnSpecs)),
		Buttons:         buttonsPtr,
		DefaultButton:   defaultBtn,
		Callback:        u.callbackPtr,
		Width:           240,
	}
	return packTaskDialogConfigAMD64(spec), bufs, rawBytes
}

func buildWindowsContent(snap UISnapshot) string {
	if snap.State != StateAvailable || snap.ReleaseNotes == "" {
		return snap.Message
	}
	trunc, _ := TruncateReleaseNotes(snap.ReleaseNotes, 6, 300)
	if snap.ReleaseURL != "" {
		return fmt.Sprintf("%s\n\n%s\n\n<a href=\"%s\">查看完整更新日志</a>", snap.Message, trunc, snap.ReleaseURL)
	}
	return fmt.Sprintf("%s\n\n%s", snap.Message, trunc)
}
