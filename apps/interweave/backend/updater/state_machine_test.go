package updater

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

type fakeUI struct {
	mu          sync.Mutex
	handler     func(UIEvent)
	snapshots   []UISnapshot
	focusCalls  int
	hideCalls   int
	closeCalls  int
	stateNotify chan State
}

func newFakeUI() *fakeUI {
	return &fakeUI{stateNotify: make(chan State, 32)}
}

func (u *fakeUI) SetEventHandler(h func(UIEvent)) {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.handler = h
}

func (u *fakeUI) Render(snap UISnapshot) {
	u.mu.Lock()
	u.snapshots = append(u.snapshots, snap)
	u.mu.Unlock()
	select {
	case u.stateNotify <- snap.State:
	default:
	}
}

func (u *fakeUI) Focus() {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.focusCalls++
}

func (u *fakeUI) Hide() {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.hideCalls++
}

func (u *fakeUI) Close() {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.closeCalls++
}

func (u *fakeUI) emit(ev UIEvent) {
	u.mu.Lock()
	h := u.handler
	u.mu.Unlock()
	if h != nil {
		h(ev)
	}
}

func (u *fakeUI) lastSnapshot() UISnapshot {
	u.mu.Lock()
	defer u.mu.Unlock()
	if len(u.snapshots) == 0 {
		return UISnapshot{}
	}
	return u.snapshots[len(u.snapshots)-1]
}

func (u *fakeUI) waitState(t *testing.T, want State) UISnapshot {
	t.Helper()
	deadline := time.After(2 * time.Second)
	for {
		select {
		case got := <-u.stateNotify:
			if got == want {
				return u.lastSnapshot()
			}
		case <-deadline:
			t.Fatalf("timed out waiting for state %q (last=%+v)", want, u.lastSnapshot())
		}
	}
}

type fakeFetcher struct {
	release       *ReleaseInfo
	fetchErr      error
	payload       []byte
	downloadCalls int
	mu            sync.Mutex
}

func (f *fakeFetcher) FetchLatestStable(ctx context.Context) (*ReleaseInfo, error) {
	if f.fetchErr != nil {
		return nil, f.fetchErr
	}
	return f.release, nil
}

func (f *fakeFetcher) DownloadAndVerify(
	ctx context.Context,
	info *ReleaseInfo,
	sessionDir string,
	onProgress func(DownloadProgress),
) (string, string, error) {
	f.mu.Lock()
	f.downloadCalls++
	payload := f.payload
	f.mu.Unlock()

	if err := EnsureExclusiveDir(sessionDir); err != nil {
		return "", "", err
	}
	p := filepath.Join(sessionDir, info.AssetName)
	if err := os.WriteFile(p, payload, 0o600); err != nil {
		return "", "", err
	}
	sum := sha256.Sum256(payload)
	if onProgress != nil {
		onProgress(DownloadProgress{Downloaded: int64(len(payload)), Total: int64(len(payload))})
	}
	return p, hex.EncodeToString(sum[:]), nil
}

type fakeInstaller struct {
	status       TargetWriteStatus
	reason       string
	installErr   error
	installCalls int
	openedPkg    string
	mu           sync.Mutex
}

func (i *fakeInstaller) CheckTargetWritable() (TargetWriteStatus, string, error) {
	return i.status, i.reason, nil
}

func (i *fakeInstaller) Prepare(ctx context.Context, stagedPath string, release *ReleaseInfo) error {
	return nil
}

func (i *fakeInstaller) InstallAndRelaunch(ctx context.Context, req InstallRequest) error {
	i.mu.Lock()
	i.installCalls++
	err := i.installErr
	i.mu.Unlock()
	if err != nil {
		return err
	}
	if req.OnReadyToQuit != nil {
		req.OnReadyToQuit()
	}
	return nil
}

func (i *fakeInstaller) OpenDownloadedPackage(ctx context.Context, stagedPath string) error {
	i.mu.Lock()
	defer i.mu.Unlock()
	i.openedPkg = stagedPath
	return nil
}

func TestControllerFullFlowAndLaterCacheReuse(t *testing.T) {
	ui := newFakeUI()
	fetcher := &fakeFetcher{
		release: &ReleaseInfo{
			Version:   SemVer{0, 4, 0},
			TagName:   "interweave-v0.4.0",
			HTMLURL:   "https://github.com/pan-Z2l0aHVi/mono/releases/tag/interweave-v0.4.0",
			Body:      "## 新功能\n- 一键更新",
			AssetName: "interweave-0.4.0-macos-arm64.dmg",
			AssetSize: 16,
		},
		payload: []byte("0123456789abcdef"),
	}
	installer := &fakeInstaller{status: TargetNeedsElevation}
	quitCalled := make(chan struct{}, 1)

	ctrl := NewController(ControllerConfig{
		CurrentVersion: "0.3.0",
		IsProduction:   true,
		ReleasesURL:    "https://github.com/pan-Z2l0aHVi/mono/releases",
		CacheDir:       t.TempDir(),
		Fetcher:        fetcher,
		UI:             ui,
		Installer:      installer,
		QuitApp:        func() { quitCalled <- struct{}{} },
	})
	defer ctrl.Shutdown()

	// 1. 首次点击检查更新 -> 发现新版本。
	ctrl.TriggerCheck()
	avail := ui.waitState(t, StateAvailable)

	// 2. 进行中再次点击菜单 -> 仅置前聚焦，不重复发起新会话。
	ctrl.TriggerCheck()
	ui.mu.Lock()
	focusCalls := ui.focusCalls
	ui.mu.Unlock()
	if focusCalls != 1 {
		t.Fatalf("expected Focus() called once, got %d", focusCalls)
	}

	// 3. 点击「安装更新」 -> 下载校验 -> 就绪待重启。
	ui.emit(UIEvent{SessionID: avail.SessionID, Kind: EventInstallUpdate})
	ready := ui.waitState(t, StateReadyToInstall)

	// 4. 点击「稍后」保留暂存包，再次点击菜单直接回到「就绪待重启」而不重复下载。
	ui.emit(UIEvent{SessionID: ready.SessionID, Kind: EventLater})
	time.Sleep(50 * time.Millisecond)
	ctrl.TriggerCheck()
	ready2 := ui.waitState(t, StateReadyToInstall)

	fetcher.mu.Lock()
	dlCalls := fetcher.downloadCalls
	fetcher.mu.Unlock()
	if dlCalls != 1 {
		t.Fatalf("expected 1 download call (reused cache), got %d", dlCalls)
	}

	// 5. 授权取消时旧应用保持存活并回到「就绪待重启」。
	installer.installErr = ErrAuthCanceled
	ui.emit(UIEvent{SessionID: ready2.SessionID, Kind: EventRestartAndInstall})
	ready3 := ui.waitState(t, StateReadyToInstall)

	// 6. 再次点击「安装并重启」授权通过 -> 触发优雅退出并保留活跃暂存目录。
	installer.installErr = nil
	ui.emit(UIEvent{SessionID: ready3.SessionID, Kind: EventRestartAndInstall})
	select {
	case <-quitCalled:
	case <-time.After(2 * time.Second):
		t.Fatal("expected QuitApp to be invoked after InstallAndRelaunch")
	}
	if !ctrl.updatingInProgress.Load() {
		t.Fatal("expected updatingInProgress to be true")
	}
}

func TestControllerDevBuildBlocksInstallAndReadOnlyFallsBack(t *testing.T) {
	ui := newFakeUI()
	fetcher := &fakeFetcher{
		release: &ReleaseInfo{
			Version:   SemVer{0, 4, 0},
			TagName:   "interweave-v0.4.0",
			AssetName: "interweave-0.4.0-windows-x64.exe",
			AssetSize: 8,
		},
		payload: []byte("12345678"),
	}

	// 开发态：允许检查更新，但点击安装立即拦截。
	devCtrl := NewController(ControllerConfig{
		CurrentVersion: "0.3.0",
		IsProduction:   false,
		ReleasesURL:    "https://github.com/pan-Z2l0aHVi/mono/releases",
		CacheDir:       t.TempDir(),
		Fetcher:        fetcher,
		UI:             ui,
		Installer:      &fakeInstaller{status: TargetWritable},
	})
	defer devCtrl.Shutdown()

	devCtrl.TriggerCheck()
	avail := ui.waitState(t, StateAvailable)
	ui.emit(UIEvent{SessionID: avail.SessionID, Kind: EventInstallUpdate})
	errSnap := ui.waitState(t, StateError)
	if errSnap.ErrorMessage == "" {
		t.Fatal("expected non-empty error message for dev build")
	}

	// 物理只读卷：先判只读，打开安装包并提示降级，不唤起安装替换。
	ui2 := newFakeUI()
	roInstaller := &fakeInstaller{status: TargetReadOnly, reason: "App Translocation"}
	prodCtrl := NewController(ControllerConfig{
		CurrentVersion: "0.3.0",
		IsProduction:   true,
		ReleasesURL:    "https://github.com/pan-Z2l0aHVi/mono/releases",
		CacheDir:       t.TempDir(),
		Fetcher:        fetcher,
		UI:             ui2,
		Installer:      roInstaller,
	})
	defer prodCtrl.Shutdown()

	prodCtrl.TriggerCheck()
	avail2 := ui2.waitState(t, StateAvailable)
	ui2.emit(UIEvent{SessionID: avail2.SessionID, Kind: EventInstallUpdate})
	ready := ui2.waitState(t, StateReadyToInstall)
	ui2.emit(UIEvent{SessionID: ready.SessionID, Kind: EventRestartAndInstall})
	ui2.waitState(t, StateError)

	roInstaller.mu.Lock()
	defer roInstaller.mu.Unlock()
	if roInstaller.installCalls != 0 {
		t.Fatalf("expected 0 InstallAndRelaunch calls on read-only target, got %d", roInstaller.installCalls)
	}
	if roInstaller.openedPkg == "" {
		t.Fatal("expected OpenDownloadedPackage to be called on read-only fallback")
	}
}
