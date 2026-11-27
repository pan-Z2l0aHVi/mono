//go:build linux

package service

import (
	"context"
	"os"
	"os/exec"
)

type execCommandRunner struct{}

func (execCommandRunner) Run(ctx context.Context, name string, args ...string) error {
	return exec.CommandContext(ctx, name, args...).Run()
}

func (execCommandRunner) Output(ctx context.Context, name string, args ...string) ([]byte, error) {
	return exec.CommandContext(ctx, name, args...).Output()
}

func setWallpaperFromFile(ctx context.Context, path string) error {
	return newLinuxWallpaperApplier(os.Getenv, execCommandRunner{}).Apply(ctx, path)
}
