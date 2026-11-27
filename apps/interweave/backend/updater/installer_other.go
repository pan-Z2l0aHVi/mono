//go:build !darwin && !windows

package updater

import (
	"context"
	"errors"
)

type unsupportedInstaller struct{}

// NewPlatformInstaller 在非 macOS/Windows 平台返回只读降级占位安装器。
func NewPlatformInstaller() Installer {
	return &unsupportedInstaller{}
}

func (u *unsupportedInstaller) CheckTargetWritable() (TargetWriteStatus, string, error) {
	return TargetReadOnly, "当前平台暂不支持原地自动更新", nil
}

func (u *unsupportedInstaller) Prepare(ctx context.Context, stagedPath string, release *ReleaseInfo) error {
	return nil
}

func (u *unsupportedInstaller) InstallAndRelaunch(ctx context.Context, req InstallRequest) error {
	return errors.New("当前平台暂不支持原地自动更新")
}

func (u *unsupportedInstaller) OpenDownloadedPackage(ctx context.Context, stagedPath string) error {
	return nil
}

func runApplyUpdate(args ApplyUpdateArgs) error {
	return errors.New("unsupported platform")
}

func runWatchdogRelaunch(args WatchdogRelaunchArgs) error {
	return errors.New("unsupported platform")
}
