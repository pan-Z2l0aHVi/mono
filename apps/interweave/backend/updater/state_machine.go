package updater

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
)

// State 表示更新弹窗与会话状态机的当前阶段。
type State string

const (
	StateIdle           State = "idle"
	StateChecking       State = "checking"
	StateUpToDate       State = "up-to-date"
	StateAvailable      State = "available"
	StateDownloading    State = "downloading"
	StateReadyToInstall State = "ready-to-install"
	StateInstalling     State = "installing"
	StateError          State = "error"
)

// UIEventKind 表示原生更新弹窗回传给状态机的用户动作类型。
type UIEventKind string

const (
	EventCancel            UIEventKind = "cancel"
	EventClose             UIEventKind = "close"
	EventLater             UIEventKind = "later"
	EventInstallUpdate     UIEventKind = "install-update"
	EventRestartAndInstall UIEventKind = "restart-and-install"
	EventOpenReleases      UIEventKind = "open-releases"
)

// UIEvent 是平台原生弹窗投递给纯 Go 状态机的事件载荷。
type UIEvent struct {
	SessionID uint64
	Kind      UIEventKind
}

// UISnapshot 是传给原生弹窗（macOS NSPanel / Windows TaskDialogIndirect）的不可变渲染快照。
type UISnapshot struct {
	SessionID        uint64
	State            State
	Title            string
	Message          string
	CurrentVersion   string
	TargetVersion    string
	ReleaseNotes     string
	ReleaseURL       string
	DownloadedBytes  int64
	TotalBytes       int64
	ProgressPercent  int // 0..100
	Indeterminate    bool
	ErrorMessage     string
	CanOpenDownloads bool
}

// UIAdapter 抽象平台原生更新弹窗。所有渲染调用都由状态机通过不可变快照驱动，
// 平台层只负责展示、聚焦、关闭以及向事件回调投递 UIEvent。
type UIAdapter interface {
	SetEventHandler(handler func(UIEvent))
	Render(snapshot UISnapshot)
	Focus()
	Hide()
	Close()
}

// TargetWriteStatus 描述当前可执行文件所在目录的可写性分级。
type TargetWriteStatus int

const (
	TargetWritable TargetWriteStatus = iota
	TargetNeedsElevation
	TargetReadOnly
)

// ErrAuthCanceled 表示用户在系统管理员授权框或 UAC 弹窗中点击了取消。
var ErrAuthCanceled = errors.New("用户已取消管理员授权")

// InstallRequest 携带执行原子替换与重启所需的全部已校验参数。
type InstallRequest struct {
	StagedFilePath string
	ExpectedSHA256 string
	TargetVersion  SemVer
	NeedsElevation bool
	OnReadyToQuit  func() // 在提权握手通过且 watchdog 就绪后回调，通知主进程优雅退出
}

// Installer 抽象平台安装包预检、提取验证、原子提权替换与重启。
type Installer interface {
	CheckTargetWritable() (TargetWriteStatus, string, error)
	// Prepare 在下载校验完成后对安装包做轻量验证（例如 macOS 挂载 DMG 核验 Interweave.app 后立即卸载）。
	Prepare(ctx context.Context, stagedPath string, release *ReleaseInfo) error
	// InstallAndRelaunch 执行三阶段无死锁交接（授权握手 → 通知主进程退出 → 原地替换与清理 .bak → 普通用户态重启）。
	InstallAndRelaunch(ctx context.Context, req InstallRequest) error
	// OpenDownloadedPackage 在物理只读降级路径下打开已下载的 .dmg 或在资源管理器中选中新 .exe。
	OpenDownloadedPackage(ctx context.Context, stagedPath string) error
}

// ReleaseFetcher 抽象 GitHub Releases 检查与下载能力，便于纯 Go 状态机单测 mock。
type ReleaseFetcher interface {
	FetchLatestStable(ctx context.Context) (*ReleaseInfo, error)
	DownloadAndVerify(
		ctx context.Context,
		info *ReleaseInfo,
		sessionDir string,
		onProgress func(DownloadProgress),
	) (filePath string, expectedSHA256 string, err error)
}

// ControllerConfig 装配纯 Go 更新控制器所需的全部依赖。
type ControllerConfig struct {
	CurrentVersion string
	IsProduction   bool
	ReleasesURL    string
	CacheDir       string
	Fetcher        ReleaseFetcher
	UI             UIAdapter
	Installer      Installer
	OpenExternal   func(ctx context.Context, targetURL string) error
	QuitApp        func()
}

type stagedPackage struct {
	release        *ReleaseInfo
	filePath       string
	expectedSHA256 string
	sessionDir     string
}

// Controller 是纯 Go 更新状态机：单协程串行消费所有 UI 事件，维护单调 sessionID、
// 取消互斥、防重入聚焦与「稍后」暂存包复用。
type Controller struct {
	currentVersion SemVer
	currentRaw     string
	isProduction   bool
	releasesURL    string
	cacheDir       string
	fetcher        ReleaseFetcher
	ui             UIAdapter
	installer      Installer
	openExternal   func(ctx context.Context, targetURL string) error
	quitApp        func()

	mu                 sync.Mutex
	state              State
	windowVisible      bool
	sessionID          uint64
	activeCancel       context.CancelFunc
	activeRelease      *ReleaseInfo
	staged             *stagedPackage
	updatingInProgress atomic.Bool
	closed             bool

	eventCh chan UIEvent
	stopCh  chan struct{}
	doneCh  chan struct{}
}

// NewController 创建并启动更新状态机事件循环。
func NewController(cfg ControllerConfig) *Controller {
	ver, err := ParseStableSemVer(cfg.CurrentVersion)
	if err != nil {
		ver = SemVer{0, 0, 0}
	}
	c := &Controller{
		currentVersion: ver,
		currentRaw:     cfg.CurrentVersion,
		isProduction:   cfg.IsProduction,
		releasesURL:    cfg.ReleasesURL,
		cacheDir:       cfg.CacheDir,
		fetcher:        cfg.Fetcher,
		ui:             cfg.UI,
		installer:      cfg.Installer,
		openExternal:   cfg.OpenExternal,
		quitApp:        cfg.QuitApp,
		state:          StateIdle,
		eventCh:        make(chan UIEvent, 32),
		stopCh:         make(chan struct{}),
		doneCh:         make(chan struct{}),
	}
	if c.ui != nil {
		c.ui.SetEventHandler(func(ev UIEvent) {
			select {
			case c.eventCh <- ev:
			default:
			}
		})
	}
	go c.eventLoop()
	return c
}

func (c *Controller) eventLoop() {
	defer close(c.doneCh)
	for {
		select {
		case <-c.stopCh:
			return
		case ev := <-c.eventCh:
			c.handleUIEvent(ev)
		}
	}
}

// TriggerCheck 由顶部菜单「检查更新」触发：
// - 若已有打开的更新窗口，直接置前聚焦而不重复发起请求；
// - 若同次运行曾点击「稍后」且已校验暂存包仍在，直接进入「就绪待重启」；
// - 否则创建新会话开始检查更新。
func (c *Controller) TriggerCheck() {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	if c.windowVisible {
		ui := c.ui
		c.mu.Unlock()
		if ui != nil {
			ui.Focus()
		}
		return
	}

	// 若同次会话之前已下载校验好安装包并点击了「稍后」，复核文件仍存在则直接回到「就绪待重启」。
	if c.staged != nil && c.staged.filePath != "" {
		if err := VerifyFileSHA256(c.staged.filePath, c.staged.expectedSHA256); err == nil {
			c.sessionID++
			sid := c.sessionID
			c.state = StateReadyToInstall
			c.windowVisible = true
			c.activeRelease = c.staged.release
			snap := c.buildReadySnapshotLocked(sid, c.staged.release)
			c.mu.Unlock()
			c.render(snap)
			return
		}
		// 缓存已被系统回收或失效，丢弃并走正常检查。
		c.staged = nil
	}

	c.sessionID++
	sid := c.sessionID
	ctx, cancel := context.WithCancel(context.Background())
	c.activeCancel = cancel
	c.state = StateChecking
	c.windowVisible = true
	c.activeRelease = nil
	snap := UISnapshot{
		SessionID:      sid,
		State:          StateChecking,
		Title:          "正在检查更新…",
		Message:        fmt.Sprintf("当前版本 v%s", c.currentVersion.String()),
		CurrentVersion: c.currentVersion.String(),
		Indeterminate:  true,
	}
	c.mu.Unlock()

	c.render(snap)
	go c.runCheck(ctx, sid)
}

func (c *Controller) runCheck(ctx context.Context, sid uint64) {
	if c.fetcher == nil {
		c.failSession(sid, "更新服务未初始化", c.releasesURL)
		return
	}
	info, err := c.fetcher.FetchLatestStable(ctx)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}
		c.failSession(sid, err.Error(), c.releasesURL)
		return
	}

	c.mu.Lock()
	if c.closed || c.sessionID != sid || c.state != StateChecking {
		c.mu.Unlock()
		return
	}
	c.activeCancel = nil

	if info.Version.Compare(c.currentVersion) <= 0 {
		c.state = StateUpToDate
		c.activeRelease = info
		snap := UISnapshot{
			SessionID:      sid,
			State:          StateUpToDate,
			Title:          "Interweave 已是最新版本",
			Message:        fmt.Sprintf("当前版本 v%s 已是最新正式版。", c.currentVersion.String()),
			CurrentVersion: c.currentVersion.String(),
			TargetVersion:  info.Version.String(),
			ReleaseURL:     c.releasePageURL(info),
		}
		c.mu.Unlock()
		c.render(snap)
		return
	}

	c.state = StateAvailable
	c.activeRelease = info
	notes := CleanReleaseNotes(info.Body)
	if notes == "" {
		notes = "本次更新包含稳定性改进与问题修复。"
	}
	snap := UISnapshot{
		SessionID:      sid,
		State:          StateAvailable,
		Title:          fmt.Sprintf("发现新版本 Interweave v%s", info.Version.String()),
		Message:        fmt.Sprintf("当前版本 v%s，新版本 v%s 已可供安装。", c.currentVersion.String(), info.Version.String()),
		CurrentVersion: c.currentVersion.String(),
		TargetVersion:  info.Version.String(),
		ReleaseNotes:   notes,
		ReleaseURL:     c.releasePageURL(info),
	}
	c.mu.Unlock()
	c.render(snap)
}

func (c *Controller) handleUIEvent(ev UIEvent) {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	// 丢弃过期会话事件（0 允许作为兜底窗口关闭事件）。
	if ev.SessionID != 0 && ev.SessionID != c.sessionID {
		c.mu.Unlock()
		return
	}
	sid := c.sessionID
	state := c.state
	release := c.activeRelease
	c.mu.Unlock()

	switch ev.Kind {
	case EventCancel, EventClose:
		c.cancelAndHide(sid, false)
	case EventLater:
		c.cancelAndHide(sid, state == StateReadyToInstall)
	case EventOpenReleases:
		targetURL := c.releasePageURL(release)
		if c.openExternal != nil && targetURL != "" {
			_ = c.openExternal(context.Background(), targetURL)
		}
	case EventInstallUpdate:
		if state != StateAvailable || release == nil {
			return
		}
		if !c.isProduction {
			c.failSession(sid, "当前为开发态构建，不支持原地替换更新，请通过源码重新构建。", c.releasePageURL(release))
			return
		}
		c.startDownload(sid, release)
	case EventRestartAndInstall:
		if state != StateReadyToInstall {
			return
		}
		c.startInstall(sid)
	}
}

func (c *Controller) cancelAndHide(sid uint64, keepStaged bool) {
	c.mu.Lock()
	if c.sessionID != sid {
		c.mu.Unlock()
		return
	}
	if c.activeCancel != nil {
		c.activeCancel()
		c.activeCancel = nil
	}
	if !keepStaged && c.staged != nil && c.state != StateReadyToInstall {
		c.staged = nil
	}
	c.state = StateIdle
	c.windowVisible = false
	ui := c.ui
	c.mu.Unlock()

	if ui != nil {
		ui.Hide()
	}
}

func (c *Controller) startDownload(sid uint64, release *ReleaseInfo) {
	c.mu.Lock()
	if c.closed || c.sessionID != sid {
		c.mu.Unlock()
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	c.activeCancel = cancel
	c.state = StateDownloading
	c.activeRelease = release
	sessionDir := filepath.Join(c.cacheDir, fmt.Sprintf("%s%d-%s", sessionDirPrefix, sid, release.Version.String()))
	snap := UISnapshot{
		SessionID:      sid,
		State:          StateDownloading,
		Title:          fmt.Sprintf("正在下载 Interweave v%s…", release.Version.String()),
		Message:        formatDownloadProgress(0, release.AssetSize),
		CurrentVersion: c.currentVersion.String(),
		TargetVersion:  release.Version.String(),
		ReleaseURL:     c.releasePageURL(release),
		TotalBytes:     release.AssetSize,
		Indeterminate:  release.AssetSize <= 0,
	}
	c.mu.Unlock()

	c.render(snap)

	go func() {
		filePath, expectedHash, err := c.fetcher.DownloadAndVerify(ctx, release, sessionDir, func(p DownloadProgress) {
			c.mu.Lock()
			if c.closed || c.sessionID != sid || c.state != StateDownloading {
				c.mu.Unlock()
				return
			}
			pct := 0
			indeterminate := p.Total <= 0
			if p.Total > 0 {
				pct = int((p.Downloaded * 100) / p.Total)
				if pct > 100 {
					pct = 100
				}
			}
			progressSnap := UISnapshot{
				SessionID:       sid,
				State:           StateDownloading,
				Title:           fmt.Sprintf("正在下载 Interweave v%s…", release.Version.String()),
				Message:         formatDownloadProgress(p.Downloaded, p.Total),
				CurrentVersion:  c.currentVersion.String(),
				TargetVersion:   release.Version.String(),
				ReleaseURL:      c.releasePageURL(release),
				DownloadedBytes: p.Downloaded,
				TotalBytes:      p.Total,
				ProgressPercent: pct,
				Indeterminate:   indeterminate,
			}
			c.mu.Unlock()
			c.render(progressSnap)
		})
		if err != nil {
			if errors.Is(err, context.Canceled) {
				return
			}
			c.failSession(sid, err.Error(), c.releasePageURL(release))
			return
		}

		// 下载并 SHA-256 校验通过后，由平台安装器做预检（如 macOS 静默挂载核验 Interweave.app 后立即卸载）。
		if c.installer != nil {
			if err := c.installer.Prepare(ctx, filePath, release); err != nil {
				if errors.Is(err, context.Canceled) {
					return
				}
				c.failSession(sid, fmt.Sprintf("校验安装包内容失败: %v", err), c.releasePageURL(release))
				return
			}
		}

		c.mu.Lock()
		if c.closed || c.sessionID != sid || c.state != StateDownloading {
			c.mu.Unlock()
			return
		}
		c.activeCancel = nil
		c.state = StateReadyToInstall
		c.staged = &stagedPackage{
			release:        release,
			filePath:       filePath,
			expectedSHA256: expectedHash,
			sessionDir:     sessionDir,
		}
		readySnap := c.buildReadySnapshotLocked(sid, release)
		c.mu.Unlock()

		c.render(readySnap)
	}()
}

func (c *Controller) startInstall(sid uint64) {
	c.mu.Lock()
	if c.closed || c.sessionID != sid || c.state != StateReadyToInstall || c.staged == nil {
		c.mu.Unlock()
		return
	}
	if !c.isProduction {
		rel := c.staged.release
		c.mu.Unlock()
		c.failSession(sid, "当前为开发态构建，不支持原地替换更新，请通过源码重新构建。", c.releasePageURL(rel))
		return
	}
	staged := *c.staged
	c.state = StateInstalling
	snap := UISnapshot{
		SessionID:      sid,
		State:          StateInstalling,
		Title:          "正在准备安装更新…",
		Message:        "请稍候，如弹出系统管理员授权框请确认以完成替换。",
		CurrentVersion: c.currentVersion.String(),
		TargetVersion:  staged.release.Version.String(),
		ReleaseURL:     c.releasePageURL(staged.release),
		Indeterminate:  true,
	}
	c.mu.Unlock()

	c.render(snap)

	go func() {
		// 无论提权与否，安装前统一复核暂存包存在性与 SHA-256；若被系统回收则平滑退回重新下载。
		if err := VerifyFileSHA256(staged.filePath, staged.expectedSHA256); err != nil {
			c.mu.Lock()
			if c.sessionID == sid && !c.closed {
				c.staged = nil
			}
			c.mu.Unlock()
			c.startDownload(sid, staged.release)
			return
		}

		if c.installer == nil {
			c.failSession(sid, "当前平台不支持原地自动安装，请前往发布页手动下载。", c.releasePageURL(staged.release))
			return
		}

		// 先判物理只读，再判权限不足。
		status, reason, err := c.installer.CheckTargetWritable()
		if err != nil {
			c.failSession(sid, fmt.Sprintf("检查安装目录权限失败: %v", err), c.releasePageURL(staged.release))
			return
		}
		if status == TargetReadOnly {
			_ = c.installer.OpenDownloadedPackage(context.Background(), staged.filePath)
			msg := "当前从只读卷或隔离路径运行，无法原地替换。已为您打开下载好的安装包，请手动完成安装。"
			if reason != "" {
				msg = fmt.Sprintf("%s（%s）", msg, reason)
			}
			c.failSession(sid, msg, c.releasePageURL(staged.release))
			return
		}

		err = c.installer.InstallAndRelaunch(context.Background(), InstallRequest{
			StagedFilePath: staged.filePath,
			ExpectedSHA256: staged.expectedSHA256,
			TargetVersion:  staged.release.Version,
			NeedsElevation: status == TargetNeedsElevation,
			OnReadyToQuit: func() {
				c.updatingInProgress.Store(true)
				if c.quitApp != nil {
					c.quitApp()
				}
			},
		})
		if err != nil {
			if errors.Is(err, ErrAuthCanceled) {
				// 用户取消系统授权框：旧应用保持存活并回到「就绪待重启」。
				c.mu.Lock()
				if c.sessionID == sid && !c.closed {
					c.state = StateReadyToInstall
					readySnap := c.buildReadySnapshotLocked(sid, staged.release)
					c.mu.Unlock()
					c.render(readySnap)
					return
				}
				c.mu.Unlock()
				return
			}
			c.updatingInProgress.Store(false)
			c.failSession(sid, fmt.Sprintf("安装更新失败: %v", err), c.releasePageURL(staged.release))
		}
	}()
}

func (c *Controller) failSession(sid uint64, msg string, releaseURL string) {
	c.mu.Lock()
	if c.closed || c.sessionID != sid {
		c.mu.Unlock()
		return
	}
	c.activeCancel = nil
	c.state = StateError
	snap := UISnapshot{
		SessionID:        sid,
		State:            StateError,
		Title:            "更新失败",
		Message:          msg,
		ErrorMessage:     msg,
		CurrentVersion:   c.currentVersion.String(),
		ReleaseURL:       releaseURL,
		CanOpenDownloads: releaseURL != "",
	}
	c.mu.Unlock()
	c.render(snap)
}

func (c *Controller) buildReadySnapshotLocked(sid uint64, release *ReleaseInfo) UISnapshot {
	return UISnapshot{
		SessionID:      sid,
		State:          StateReadyToInstall,
		Title:          fmt.Sprintf("Interweave v%s 已准备就绪", release.Version.String()),
		Message:        "安装包已通过完整性校验，重启后即可使用新版本。",
		CurrentVersion: c.currentVersion.String(),
		TargetVersion:  release.Version.String(),
		ReleaseURL:     c.releasePageURL(release),
	}
}

func (c *Controller) releasePageURL(info *ReleaseInfo) string {
	if info != nil && info.HTMLURL != "" {
		return info.HTMLURL
	}
	return c.releasesURL
}

func (c *Controller) render(snap UISnapshot) {
	if c.ui != nil {
		c.ui.Render(snap)
	}
}

// CleanupStaleCache 清理历史过期暂存目录，跳过当前活跃会话。
func (c *Controller) CleanupStaleCache() {
	c.mu.Lock()
	activeDir := ""
	if c.staged != nil {
		activeDir = c.staged.sessionDir
	}
	cacheDir := c.cacheDir
	c.mu.Unlock()
	_ = CleanupStaleSessions(cacheDir, activeDir, staleSessionAge)
}

// Shutdown 在应用退出钩子中调用：关闭原生更新弹窗，并在非「更新重启」场景下清理暂存目录。
func (c *Controller) Shutdown() {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	c.closed = true
	if c.activeCancel != nil {
		c.activeCancel()
		c.activeCancel = nil
	}
	stagedDir := ""
	if c.staged != nil {
		stagedDir = c.staged.sessionDir
	}
	ui := c.ui
	cacheDir := c.cacheDir
	c.mu.Unlock()

	close(c.stopCh)
	<-c.doneCh

	if ui != nil {
		ui.Close()
	}

	// 若正在执行「安装并重启」，绝不删除当前活跃更新目录，以免中断提权安装器或 watchdog 读取安装包。
	if !c.updatingInProgress.Load() {
		if stagedDir != "" {
			_ = os.RemoveAll(stagedDir)
		}
		_ = CleanupStaleSessions(cacheDir, "", 0)
	}
}

// State 返回当前状态机状态（便于单测断言）。
func (c *Controller) State() State {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.state
}

func formatDownloadProgress(downloaded, total int64) string {
	if total <= 0 {
		return fmt.Sprintf("已下载 %s…", formatBytes(downloaded))
	}
	pct := int((downloaded * 100) / total)
	if pct > 100 {
		pct = 100
	}
	return fmt.Sprintf("已下载 %s / %s（%d%%）", formatBytes(downloaded), formatBytes(total), pct)
}

func formatBytes(n int64) string {
	const (
		kb = 1024
		mb = 1024 * kb
	)
	switch {
	case n >= mb:
		return fmt.Sprintf("%.1f MB", float64(n)/float64(mb))
	case n >= kb:
		return fmt.Sprintf("%.1f KB", float64(n)/float64(kb))
	default:
		return fmt.Sprintf("%d B", n)
	}
}
