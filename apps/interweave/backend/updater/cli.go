package updater

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
)

const (
	// SubcommandApplyUpdate 是内部自举安装子命令，必须在 main() 最顶部、
	// Wails application.New 与单实例锁初始化之前优先分流处理。
	SubcommandApplyUpdate = "--apply-update"
	// SubcommandWatchdogRelaunch 是普通用户态脱离父进程组的重启守望子命令。
	SubcommandWatchdogRelaunch = "--watchdog-relaunch"
)

// ApplyUpdateArgs 描述 --apply-update 子命令的严格命令行参数。
type ApplyUpdateArgs struct {
	OldPID       int
	SourcePath   string
	TargetPath   string
	ExpectedHash string
	Version      string
	BundleID     string
	AuthFile     string
	DoneEvent    string
	DoneFile     string
}

// WatchdogRelaunchArgs 描述 --watchdog-relaunch 子命令的严格命令行参数。
type WatchdogRelaunchArgs struct {
	OldPID       int
	HelperPID    int
	TargetPath   string
	ExpectedHash string
	DoneEvent    string
	ReadyEvent   string
	DoneFile     string
}

// HandleSubcommand 在 main() 最顶部检查 os.Args[1] 是否为更新器内部子命令。
// 若命中，执行对应逻辑并返回 (true, exitCode)，调用方应立即 os.Exit(exitCode)；
// 若未命中，返回 (false, 0) 继续正常启动 Wails 桌面应用。
func HandleSubcommand(args []string) (handled bool, exitCode int) {
	if len(args) < 2 {
		return false, 0
	}
	switch args[1] {
	case SubcommandApplyUpdate:
		parsed, err := parseApplyUpdateArgs(args[2:])
		if err != nil {
			fmt.Fprintf(os.Stderr, "interweave updater: %v\n", err)
			return true, 2
		}
		if err := runApplyUpdate(parsed); err != nil {
			fmt.Fprintf(os.Stderr, "interweave updater: apply failed: %v\n", err)
			return true, 1
		}
		return true, 0
	case SubcommandWatchdogRelaunch:
		parsed, err := parseWatchdogRelaunchArgs(args[2:])
		if err != nil {
			fmt.Fprintf(os.Stderr, "interweave updater: %v\n", err)
			return true, 2
		}
		if err := runWatchdogRelaunch(parsed); err != nil {
			fmt.Fprintf(os.Stderr, "interweave updater: relaunch failed: %v\n", err)
			return true, 1
		}
		return true, 0
	default:
		return false, 0
	}
}

func parseApplyUpdateArgs(raw []string) (ApplyUpdateArgs, error) {
	fs := flag.NewFlagSet(SubcommandApplyUpdate, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var a ApplyUpdateArgs
	fs.IntVar(&a.OldPID, "pid", 0, "old app pid")
	fs.StringVar(&a.SourcePath, "source", "", "staged installer file path")
	fs.StringVar(&a.TargetPath, "target", "", "target app/exe path")
	fs.StringVar(&a.ExpectedHash, "sha256", "", "expected sha256 hex digest")
	fs.StringVar(&a.Version, "version", "", "expected target version")
	fs.StringVar(&a.BundleID, "bundle-id", "", "expected macOS bundle id")
	fs.StringVar(&a.AuthFile, "auth-file", "", "auth-granted handshake marker file")
	fs.StringVar(&a.DoneEvent, "done-event", "", "windows named event signaled on completion")
	fs.StringVar(&a.DoneFile, "done-file", "", "unix completion status file")
	if err := fs.Parse(raw); err != nil {
		return ApplyUpdateArgs{}, err
	}
	if a.OldPID <= 0 || strings.TrimSpace(a.SourcePath) == "" || strings.TrimSpace(a.TargetPath) == "" {
		return ApplyUpdateArgs{}, fmt.Errorf("missing required --pid, --source, or --target")
	}
	a.ExpectedHash = strings.ToLower(strings.TrimSpace(a.ExpectedHash))
	if len(a.ExpectedHash) != 64 {
		return ApplyUpdateArgs{}, fmt.Errorf("invalid --sha256 digest")
	}
	return a, nil
}

func parseWatchdogRelaunchArgs(raw []string) (WatchdogRelaunchArgs, error) {
	fs := flag.NewFlagSet(SubcommandWatchdogRelaunch, flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	var a WatchdogRelaunchArgs
	fs.IntVar(&a.OldPID, "old-pid", 0, "old app pid")
	fs.IntVar(&a.HelperPID, "helper-pid", 0, "apply-update helper pid")
	fs.StringVar(&a.TargetPath, "target", "", "target app/exe path to relaunch")
	fs.StringVar(&a.ExpectedHash, "sha256", "", "expected sha256 hex digest of updated target")
	fs.StringVar(&a.DoneEvent, "done-event", "", "windows named event")
	fs.StringVar(&a.ReadyEvent, "ready-event", "", "windows named event signaled once watchdog holds done-event")
	fs.StringVar(&a.DoneFile, "done-file", "", "unix completion status file")
	if err := fs.Parse(raw); err != nil {
		return WatchdogRelaunchArgs{}, err
	}
	if strings.TrimSpace(a.TargetPath) == "" {
		return WatchdogRelaunchArgs{}, fmt.Errorf("missing required --target")
	}
	a.ExpectedHash = strings.ToLower(strings.TrimSpace(a.ExpectedHash))
	if a.ExpectedHash != "" && len(a.ExpectedHash) != 64 {
		return WatchdogRelaunchArgs{}, fmt.Errorf("invalid --sha256 digest")
	}
	return a, nil
}
