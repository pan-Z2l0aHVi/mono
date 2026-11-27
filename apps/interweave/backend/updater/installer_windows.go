//go:build windows

// cspell:ignore CDROM runas

package updater

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	driveCDROM            = 5
	driveRemote           = 4
	fileReadOnlyVolume    = 0x00080000
	fileAttrReparsePoint  = 0x00000400
	seeMaskNoCloseProcess = 0x00000040
	swHide                = 0
	errorCancelled        = 1223
)

type shellExecuteInfoW struct {
	cbSize         uint32
	fMask          uint32
	hwnd           uintptr
	lpVerb         *uint16
	lpFile         *uint16
	lpParameters   *uint16
	lpDirectory    *uint16
	nShow          int32
	hInstApp       uintptr
	lpIDList       uintptr
	lpClass        *uint16
	hkeyClass      uintptr
	dwHotKey       uint32
	hIconOrMonitor uintptr
	hProcess       windows.Handle
}

var (
	shell32             = windows.NewLazySystemDLL("shell32.dll")
	procShellExecuteExW = shell32.NewProc("ShellExecuteExW")
)

type windowsInstaller struct{}

// NewPlatformInstaller 返回 Windows 单文件自举提权安装器。
func NewPlatformInstaller() Installer {
	return &windowsInstaller{}
}

func (w *windowsInstaller) CheckTargetWritable() (TargetWriteStatus, string, error) {
	exePath, err := os.Executable()
	if err != nil {
		return TargetReadOnly, "", err
	}
	exePath = filepath.Clean(exePath)
	dir := filepath.Dir(exePath)

	// 先判物理只读（光驱、网络映射或只读卷），命中直接降级，绝不唤起 UAC。
	root := filepath.VolumeName(dir) + `\`
	if rootPtr, err := windows.UTF16PtrFromString(root); err == nil {
		dt := windows.GetDriveType(rootPtr)
		if dt == driveCDROM || dt == driveRemote {
			return TargetReadOnly, "只读光驱或网络共享路径", nil
		}
		var flags uint32
		if err := windows.GetVolumeInformation(rootPtr, nil, 0, nil, nil, &flags, nil, 0); err == nil {
			if flags&fileReadOnlyVolume != 0 {
				return TargetReadOnly, "只读文件系统卷", nil
			}
		}
	}

	// 探测目标目录写权限。
	probe, err := os.CreateTemp(dir, ".interweave-write-probe-*")
	if err != nil {
		if errors.Is(err, os.ErrPermission) || errors.Is(err, windows.ERROR_ACCESS_DENIED) {
			return TargetNeedsElevation, "安装目录需要管理员权限", nil
		}
		return TargetReadOnly, err.Error(), nil
	}
	probeName := probe.Name()
	_ = probe.Close()
	_ = os.Remove(probeName)
	return TargetWritable, "", nil
}

func (w *windowsInstaller) Prepare(ctx context.Context, stagedPath string, release *ReleaseInfo) error {
	info, err := os.Stat(stagedPath)
	if err != nil {
		return err
	}
	if info.Size() == 0 {
		return errors.New("downloaded exe is empty")
	}
	return nil
}

func (w *windowsInstaller) OpenDownloadedPackage(ctx context.Context, stagedPath string) error {
	cmd := exec.CommandContext(ctx, "explorer.exe", "/select,"+filepath.Clean(stagedPath))
	return cmd.Start()
}

func (w *windowsInstaller) InstallAndRelaunch(ctx context.Context, req InstallRequest) error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve current executable: %w", err)
	}
	exePath = filepath.Clean(exePath)
	oldPID := os.Getpid()
	eventName := fmt.Sprintf("Local\\InterweaveUpdateDone-%d-%d", oldPID, time.Now().UnixNano())

	doneEventHandle, err := createNamedEvent(eventName)
	if err != nil {
		return fmt.Errorf("create update sync event: %w", err)
	}
	// 由 watchdog 继续持有同名事件句柄，这里在启动 helper + watchdog 后再关闭。
	defer windows.CloseHandle(doneEventHandle)

	applyArgs := []string{
		SubcommandApplyUpdate,
		"--pid=" + strconv.Itoa(oldPID),
		"--source=" + req.StagedFilePath,
		"--target=" + exePath,
		"--sha256=" + req.ExpectedSHA256,
		"--version=" + req.TargetVersion.String(),
		"--done-event=" + eventName,
	}

	// 需提权时，改由已安装在受保护目录的当前旧版 exe 自举执行 --apply-update（消除用户态缓存提权自校验 TOCTOU）。
	if req.NeedsElevation {
		hProc, err := shellExecuteElevated(exePath, buildWindowsArgLine(applyArgs))
		if err != nil {
			return err
		}
		if hProc != 0 {
			_ = windows.CloseHandle(hProc)
		}
	} else {
		cmd := exec.Command(exePath, applyArgs...)
		cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: windows.CREATE_NEW_PROCESS_GROUP | windows.DETACHED_PROCESS}
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("start update helper: %w", err)
		}
	}

	// UAC 授权通过后再启动独立普通用户态（Medium IL）watchdog，等 done-event 信号后直接 CreateProcess 拉起新版。
	watchdogArgs := []string{
		SubcommandWatchdogRelaunch,
		"--old-pid=" + strconv.Itoa(oldPID),
		"--target=" + exePath,
		"--done-event=" + eventName,
	}
	wdCmd := exec.Command(exePath, watchdogArgs...)
	wdCmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: windows.CREATE_NEW_PROCESS_GROUP | windows.DETACHED_PROCESS}
	if err := wdCmd.Start(); err != nil {
		return fmt.Errorf("start relaunch watchdog: %w", err)
	}

	// 通知主进程优雅退出（关闭 SQLite 与 Wails OnShutdown），解除对旧 exe 的占用。
	if req.OnReadyToQuit != nil {
		req.OnReadyToQuit()
	}
	return nil
}

func runApplyUpdate(args ApplyUpdateArgs) error {
	targetPath := filepath.Clean(args.TargetPath)
	targetDir := filepath.Dir(targetPath)

	// 1. 拒绝目标路径或父目录为 NTFS 重解析点（防止符号链接/联接点劫持）。
	if isReparsePoint(targetPath) || isReparsePoint(targetDir) {
		return errors.New("refusing to update reparse point target")
	}

	// 2. 精确等待旧主进程 PID 退出（15–30s 超时，已退出视为成功）。
	if err := waitProcessExit(args.OldPID, 25*time.Second); err != nil {
		return fmt.Errorf("wait old process exit: %w", err)
	}

	// 3. 将新 exe 流式拷贝到目标受保护目录的 .new 暂存文件，并对落盘后的 .new 复核 SHA-256。
	newPath := targetPath + ".new"
	bakPath := targetPath + ".bak"
	_ = os.Remove(newPath)
	if err := copyFileExclusive(args.SourcePath, newPath); err != nil {
		return fmt.Errorf("stage new exe in target dir: %w", err)
	}
	if err := VerifyFileSHA256(newPath, args.ExpectedHash); err != nil {
		_ = os.Remove(newPath)
		return fmt.Errorf("verify staged exe in protected dir: %w", err)
	}

	// 4. 清理历史遗留 .bak，再以指数退避重试完成原子切换（防 Defender / 句柄短暂占用）。
	_ = os.Remove(bakPath)
	if err := renameWithRetry(targetPath, bakPath); err != nil {
		_ = os.Remove(newPath)
		return fmt.Errorf("backup existing exe: %w", err)
	}
	if err := renameWithRetry(newPath, targetPath); err != nil {
		// 切换失败立即回滚 .bak。
		_ = renameWithRetry(bakPath, targetPath)
		_ = os.Remove(newPath)
		return fmt.Errorf("swap new exe into place: %w", err)
	}

	// 5. 在同一提权事务内立即删除 .bak，避免普通用户态无权清理。
	_ = removeWithRetry(bakPath)

	// 6. 通知普通用户态 watchdog 替换成功。
	if args.DoneEvent != "" {
		_ = signalNamedEvent(args.DoneEvent)
	}
	return nil
}

func runWatchdogRelaunch(args WatchdogRelaunchArgs) error {
	if args.DoneEvent != "" {
		h, err := openNamedEvent(args.DoneEvent)
		if err != nil {
			// 事件可能尚未打开或已创建；回退等待旧 PID 退出。
			_ = waitProcessExit(args.OldPID, 30*time.Second)
		} else {
			defer windows.CloseHandle(h)
			res, err := windows.WaitForSingleObject(h, 45_000)
			if err != nil || res != windows.WAIT_OBJECT_0 {
				return fmt.Errorf("wait update completion event failed: res=%d err=%v", res, err)
			}
		}
	} else {
		_ = waitProcessExit(args.OldPID, 30*time.Second)
	}

	// 在普通用户态 Medium IL 下直接启动新版本 Interweave.exe。
	cmd := exec.Command(filepath.Clean(args.TargetPath))
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: windows.CREATE_NEW_PROCESS_GROUP}
	return cmd.Start()
}

func shellExecuteElevated(filePath string, params string) (windows.Handle, error) {
	verbPtr, err := windows.UTF16PtrFromString("runas")
	if err != nil {
		return 0, err
	}
	filePtr, err := windows.UTF16PtrFromString(filePath)
	if err != nil {
		return 0, err
	}
	paramPtr, err := windows.UTF16PtrFromString(params)
	if err != nil {
		return 0, err
	}
	info := shellExecuteInfoW{
		cbSize:       uint32(unsafe.Sizeof(shellExecuteInfoW{})),
		fMask:        seeMaskNoCloseProcess,
		lpVerb:       verbPtr,
		lpFile:       filePtr,
		lpParameters: paramPtr,
		nShow:        swHide,
	}
	ret, _, callErr := procShellExecuteExW.Call(uintptr(unsafe.Pointer(&info)))
	if ret == 0 {
		if errno, ok := callErr.(syscall.Errno); ok && errno == errorCancelled {
			return 0, ErrAuthCanceled
		}
		return 0, fmt.Errorf("ShellExecuteExW(runas) failed: %w", callErr)
	}
	return info.hProcess, nil
}

func buildWindowsArgLine(args []string) string {
	quoted := make([]string, len(args))
	for i, a := range args {
		quoted[i] = syscall.EscapeArg(a)
	}
	return strings.Join(quoted, " ")
}

func waitProcessExit(pid int, timeout time.Duration) error {
	if pid <= 0 {
		return nil
	}
	h, err := windows.OpenProcess(windows.SYNCHRONIZE, false, uint32(pid))
	if err != nil {
		// 进程已退出时 OpenProcess 返回 ERROR_INVALID_PARAMETER，视为已退出。
		return nil
	}
	defer windows.CloseHandle(h)
	res, err := windows.WaitForSingleObject(h, uint32(timeout.Milliseconds()))
	if err != nil {
		return err
	}
	if res != windows.WAIT_OBJECT_0 {
		return fmt.Errorf("process %d did not exit within %s", pid, timeout)
	}
	return nil
}

func isReparsePoint(path string) bool {
	p, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return false
	}
	attrs, err := windows.GetFileAttributes(p)
	if err != nil {
		return false
	}
	return attrs&fileAttrReparsePoint != 0
}

func copyFileExclusive(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o700)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func renameWithRetry(oldPath, newPath string) error {
	delay := 100 * time.Millisecond
	var lastErr error
	for attempt := 0; attempt < 8; attempt++ {
		if err := os.Rename(oldPath, newPath); err == nil {
			return nil
		} else {
			lastErr = err
		}
		time.Sleep(delay)
		if delay < time.Second {
			delay *= 2
		}
	}
	return lastErr
}

func removeWithRetry(path string) error {
	delay := 100 * time.Millisecond
	var lastErr error
	for attempt := 0; attempt < 6; attempt++ {
		if err := os.Remove(path); err == nil || os.IsNotExist(err) {
			return nil
		} else {
			lastErr = err
		}
		time.Sleep(delay)
		if delay < time.Second {
			delay *= 2
		}
	}
	return lastErr
}

func createNamedEvent(name string) (windows.Handle, error) {
	ptr, err := windows.UTF16PtrFromString(name)
	if err != nil {
		return 0, err
	}
	return windows.CreateEvent(nil, 1, 0, ptr)
}

func openNamedEvent(name string) (windows.Handle, error) {
	ptr, err := windows.UTF16PtrFromString(name)
	if err != nil {
		return 0, err
	}
	return windows.OpenEvent(windows.SYNCHRONIZE|windows.EVENT_MODIFY_STATE, false, ptr)
}

func signalNamedEvent(name string) error {
	h, err := openNamedEvent(name)
	if err != nil {
		return err
	}
	defer windows.CloseHandle(h)
	return windows.SetEvent(h)
}
