//go:build darwin

// cspell:ignore Rdonly osascript xattr nobrowse noautoopen

package updater

import (
	"bytes"
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
)

const (
	expectedMacBundleID = "com.greypan.interweave"
	hdiutilTimeout      = 45 * time.Second
)

type darwinInstaller struct{}

// NewPlatformInstaller 返回 macOS DMG 挂载提取与自举提权安装器。
func NewPlatformInstaller() Installer {
	return &darwinInstaller{}
}

func resolveCurrentAppBundle() (bundlePath string, execPath string, err error) {
	exe, err := os.Executable()
	if err != nil {
		return "", "", fmt.Errorf("resolve executable: %w", err)
	}
	exe = filepath.Clean(exe)
	// 严格要求位于 *.app/Contents/MacOS/<bin>
	macosDir := filepath.Dir(exe)
	contentsDir := filepath.Dir(macosDir)
	appDir := filepath.Dir(contentsDir)
	if filepath.Base(macosDir) != "MacOS" || filepath.Base(contentsDir) != "Contents" || !strings.HasSuffix(appDir, ".app") {
		return "", exe, fmt.Errorf("当前运行路径不在标准 .app 包内: %s", exe)
	}
	return appDir, exe, nil
}

func (d *darwinInstaller) CheckTargetWritable() (TargetWriteStatus, string, error) {
	appPath, _, err := resolveCurrentAppBundle()
	if err != nil {
		return TargetReadOnly, err.Error(), nil
	}
	// 先判物理只读：App Translocation 或只读文件系统卷（如直接从 DMG 卷运行）。
	if strings.Contains(appPath, "/AppTranslocation/") {
		return TargetReadOnly, "App Translocation 安全隔离路径", nil
	}
	var stat syscall.Statfs_t
	if err := syscall.Statfs(appPath, &stat); err == nil {
		const mntRdonly = 0x00000001
		if stat.Flags&mntRdonly != 0 {
			return TargetReadOnly, "只读磁盘映像卷", nil
		}
	}

	parentDir := filepath.Dir(appPath)
	probe, err := os.CreateTemp(parentDir, ".interweave-write-probe-*")
	if err != nil {
		if errors.Is(err, os.ErrPermission) || errors.Is(err, syscall.EACCES) || errors.Is(err, syscall.EPERM) {
			return TargetNeedsElevation, "应用程序目录需要管理员权限", nil
		}
		if errors.Is(err, syscall.EROFS) {
			return TargetReadOnly, "只读文件系统", nil
		}
		return TargetReadOnly, err.Error(), nil
	}
	probeName := probe.Name()
	_ = probe.Close()
	_ = os.Remove(probeName)
	return TargetWritable, "", nil
}

func (d *darwinInstaller) Prepare(ctx context.Context, stagedPath string, release *ReleaseInfo) error {
	// 下载完成后做一次静默挂载预检：校验 DMG 内存在唯一真实目录 Interweave.app 且 BundleID/版本匹配，随后立即卸载。
	mountDir, err := os.MkdirTemp(filepath.Dir(stagedPath), "mnt-verify-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(mountDir)

	if err := attachDMG(ctx, stagedPath, mountDir); err != nil {
		return err
	}
	defer detachDMG(mountDir)

	appInDMG, err := validateDMGAppBundle(mountDir, expectedMacBundleID, release.Version.String())
	if err != nil {
		return err
	}
	_ = appInDMG
	return nil
}

func (d *darwinInstaller) OpenDownloadedPackage(ctx context.Context, stagedPath string) error {
	cmd := exec.CommandContext(ctx, "open", stagedPath)
	return cmd.Start()
}

func (d *darwinInstaller) InstallAndRelaunch(ctx context.Context, req InstallRequest) error {
	appPath, exePath, err := resolveCurrentAppBundle()
	if err != nil {
		return err
	}
	oldPID := os.Getpid()
	workDir := filepath.Dir(req.StagedFilePath)
	authFile := filepath.Join(workDir, fmt.Sprintf("auth-%d.ok", time.Now().UnixNano()))
	doneFile := filepath.Join(workDir, fmt.Sprintf("done-%d.status", time.Now().UnixNano()))

	applyArgs := []string{
		SubcommandApplyUpdate,
		"--pid=" + strconv.Itoa(oldPID),
		"--source=" + req.StagedFilePath,
		"--target=" + appPath,
		"--sha256=" + req.ExpectedSHA256,
		"--version=" + req.TargetVersion.String(),
		"--bundle-id=" + expectedMacBundleID,
		"--auth-file=" + authFile,
		"--done-file=" + doneFile,
	}

	if req.NeedsElevation {
		// 使用 osascript `on run argv` + `quoted form of` 严格传参调用已安装 .app 内的 Go 二进制，
		// 严禁 shell 字符串拼接；等待 authFile 握手成功后再退出旧进程，用户取消密码框时旧应用保持存活。
		osascriptErrCh := make(chan error, 1)
		go func() {
			osascriptErrCh <- runElevatedDarwinApply(exePath, applyArgs)
		}()

		if err := waitAuthHandshake(authFile, osascriptErrCh, 120*time.Second); err != nil {
			return err
		}
	} else {
		cmd := exec.Command(exePath, applyArgs...)
		cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("start macOS update helper: %w", err)
		}
	}

	// 启动脱离进程组的普通 UID watchdog，待 doneFile 标记成功后以普通用户身份 open -n 拉起新版本。
	wdCmd := exec.Command(exePath,
		SubcommandWatchdogRelaunch,
		"--old-pid="+strconv.Itoa(oldPID),
		"--target="+appPath,
		"--done-file="+doneFile,
	)
	wdCmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := wdCmd.Start(); err != nil {
		return fmt.Errorf("start macOS relaunch watchdog: %w", err)
	}

	if req.OnReadyToQuit != nil {
		req.OnReadyToQuit()
	}
	return nil
}

func runApplyUpdate(args ApplyUpdateArgs) error {
	// 1. 提权/子进程进入后第一时间写入授权握手文件，通知旧主进程可以安全退出。
	if args.AuthFile != "" {
		_ = os.WriteFile(args.AuthFile, []byte("ok"), 0o600)
	}

	writeDone := func(status string) {
		if args.DoneFile != "" {
			_ = os.WriteFile(args.DoneFile, []byte(status), 0o644)
		}
	}

	targetApp := filepath.Clean(args.TargetPath)
	if !strings.HasSuffix(targetApp, ".app") {
		writeDone("err")
		return fmt.Errorf("invalid target app path: %q", targetApp)
	}
	// 拒绝符号链接目标，防止提权上下文被诱导覆盖非本应用路径。
	if err := rejectSymlink(targetApp); err != nil {
		writeDone("err")
		return err
	}
	// 核验待替换目标 .app 的 CFBundleIdentifier。
	if args.BundleID != "" {
		if bid, err := readPlistValue(filepath.Join(targetApp, "Contents", "Info.plist"), "CFBundleIdentifier"); err == nil && bid != args.BundleID {
			writeDone("err")
			return fmt.Errorf("target bundle id mismatch: got %q, want %q", bid, args.BundleID)
		}
	}

	// 2. 在当前（提权）属主独占 0700 临时目录中拷贝 .dmg 副本并复核 SHA-256，闭合 TOCTOU 窗口。
	privDir, err := os.MkdirTemp("", "interweave-apply-*")
	if err != nil {
		writeDone("err")
		return err
	}
	_ = os.Chmod(privDir, 0o700)
	defer os.RemoveAll(privDir)

	dmgCopy := filepath.Join(privDir, "update.dmg")
	if err := copyFile0600(args.SourcePath, dmgCopy); err != nil {
		writeDone("err")
		return fmt.Errorf("copy dmg to private dir: %w", err)
	}
	if err := VerifyFileSHA256(dmgCopy, args.ExpectedHash); err != nil {
		writeDone("err")
		return fmt.Errorf("re-verify dmg sha256: %w", err)
	}

	mountDir := filepath.Join(privDir, "mnt")
	if err := os.Mkdir(mountDir, 0o700); err != nil {
		writeDone("err")
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), hdiutilTimeout)
	defer cancel()
	if err := attachDMG(ctx, dmgCopy, mountDir); err != nil {
		writeDone("err")
		return err
	}
	defer detachDMG(mountDir)

	appInDMG, err := validateDMGAppBundle(mountDir, args.BundleID, args.Version)
	if err != nil {
		writeDone("err")
		return err
	}

	// 3. 等待旧主进程优雅退出，释放 SQLite 与文件锁。
	waitUnixProcessExit(args.OldPID, 25*time.Second)

	// 4. 使用 ditto 拷贝至目标 .app 同父目录的隐藏暂存名，保证后续 rename 同卷原子操作（避免 EXDEV）。
	parentDir := filepath.Dir(targetApp)
	baseName := filepath.Base(targetApp)
	stagedApp := filepath.Join(parentDir, fmt.Sprintf(".%s.new.%d", baseName, os.Getpid()))
	backupApp := filepath.Join(parentDir, fmt.Sprintf(".%s.bak", baseName))
	_ = os.RemoveAll(stagedApp)
	_ = os.RemoveAll(backupApp)

	dittoCmd := exec.Command("ditto", appInDMG, stagedApp)
	if out, err := dittoCmd.CombinedOutput(); err != nil {
		_ = os.RemoveAll(stagedApp)
		writeDone("err")
		return fmt.Errorf("ditto failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}

	// 清除新 .app 的 com.apple.quarantine 扩展属性，避免 ad-hoc 签名重启后被 Gatekeeper 拦截。
	_ = exec.Command("xattr", "-dr", "com.apple.quarantine", stagedApp).Run()

	// 5. 同卷原子切换，失败自动回滚，成功则在同一提权上下文内立即删除 .bak。
	if err := os.Rename(targetApp, backupApp); err != nil {
		_ = os.RemoveAll(stagedApp)
		writeDone("err")
		return fmt.Errorf("backup existing app: %w", err)
	}
	if err := os.Rename(stagedApp, targetApp); err != nil {
		_ = os.Rename(backupApp, targetApp)
		_ = os.RemoveAll(stagedApp)
		writeDone("err")
		return fmt.Errorf("swap new app: %w", err)
	}
	_ = os.RemoveAll(backupApp)

	// 刷新 LaunchServices / Finder 缓存。
	now := time.Now()
	_ = os.Chtimes(targetApp, now, now)

	writeDone("ok")
	return nil
}

func runWatchdogRelaunch(args WatchdogRelaunchArgs) error {
	deadline := time.Now().Add(60 * time.Second)
	for time.Now().Before(deadline) {
		if args.DoneFile != "" {
			if data, err := os.ReadFile(args.DoneFile); err == nil {
				status := strings.TrimSpace(string(data))
				_ = os.Remove(args.DoneFile)
				if status != "ok" {
					return fmt.Errorf("apply-update reported status %q", status)
				}
				break
			}
		}
		time.Sleep(150 * time.Millisecond)
	}
	waitUnixProcessExit(args.OldPID, 10*time.Second)
	// 以普通用户 UID 调用 open -n 拉起新版本，绝不继承 root 权限。
	return exec.Command("open", "-n", filepath.Clean(args.TargetPath)).Start()
}

func runElevatedDarwinApply(exePath string, applyArgs []string) error {
	script := `on run argv
	set cmd to ""
	repeat with a in argv
		if cmd is not "" then
			set cmd to cmd & " "
		end if
		set cmd to cmd & quoted form of (a as text)
	end repeat
	do shell script cmd with administrator privileges
end run`
	cmdArgs := make([]string, 0, len(applyArgs)+3)
	cmdArgs = append(cmdArgs, "-e", script, exePath)
	cmdArgs = append(cmdArgs, applyArgs...)
	cmd := exec.Command("osascript", cmdArgs...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if strings.Contains(msg, "-128") || strings.Contains(strings.ToLower(msg), "canceled") || strings.Contains(strings.ToLower(msg), "cancelled") {
			return ErrAuthCanceled
		}
		return fmt.Errorf("管理员授权执行失败: %w (%s)", err, msg)
	}
	return nil
}

func waitAuthHandshake(authFile string, errCh <-chan error, timeout time.Duration) error {
	deadline := time.After(timeout)
	ticker := time.NewTicker(80 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case err := <-errCh:
			if err != nil {
				return err
			}
			return nil
		case <-ticker.C:
			if _, err := os.Stat(authFile); err == nil {
				return nil
			}
		case <-deadline:
			return errors.New("等待管理员授权超时")
		}
	}
}

func attachDMG(ctx context.Context, dmgPath string, mountPoint string) error {
	cmd := exec.CommandContext(ctx,
		"hdiutil", "attach",
		"-nobrowse", "-readonly", "-noautoopen",
		"-mountpoint", mountPoint,
		dmgPath,
	)
	cmd.Stdin = nil
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("hdiutil attach failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func detachDMG(mountPoint string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = exec.CommandContext(ctx, "hdiutil", "detach", mountPoint, "-force").Run()
}

func validateDMGAppBundle(mountPoint string, expectedBundleID string, expectedVersion string) (string, error) {
	entries, err := os.ReadDir(mountPoint)
	if err != nil {
		return "", err
	}
	var found string
	for _, entry := range entries {
		if !strings.HasSuffix(entry.Name(), ".app") {
			continue
		}
		if entry.Type()&os.ModeSymlink != 0 || !entry.IsDir() {
			return "", fmt.Errorf("DMG 中包含非真实目录的 .app 条目: %s", entry.Name())
		}
		if found != "" {
			return "", errors.New("DMG 根目录包含多个 .app，拒绝安装")
		}
		found = filepath.Join(mountPoint, entry.Name())
	}
	if found == "" {
		return "", errors.New("DMG 中未找到 Interweave.app")
	}

	plistPath := filepath.Join(found, "Contents", "Info.plist")
	if expectedBundleID != "" {
		bid, err := readPlistValue(plistPath, "CFBundleIdentifier")
		if err != nil {
			return "", fmt.Errorf("读取安装包 CFBundleIdentifier 失败: %w", err)
		}
		if bid != expectedBundleID {
			return "", fmt.Errorf("安装包 CFBundleIdentifier 不匹配: got %q, want %q", bid, expectedBundleID)
		}
	}
	if expectedVersion != "" {
		ver, err := readPlistValue(plistPath, "CFBundleShortVersionString")
		if err == nil && ver != "" && ver != expectedVersion {
			return "", fmt.Errorf("安装包版本不匹配: got %q, want %q", ver, expectedVersion)
		}
	}
	return found, nil
}

func readPlistValue(plistPath string, key string) (string, error) {
	cmd := exec.Command("/usr/libexec/PlistBuddy", "-c", "Print :"+key, plistPath)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", err
	}
	return strings.TrimSpace(out.String()), nil
}

func rejectSymlink(path string) error {
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("refusing symlink target: %s", path)
	}
	return nil
}

func copyFile0600(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

func waitUnixProcessExit(pid int, timeout time.Duration) {
	if pid <= 0 {
		return
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if err := syscall.Kill(pid, 0); err != nil {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
}
