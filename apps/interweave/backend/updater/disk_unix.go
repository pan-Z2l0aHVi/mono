//go:build !windows

// cspell:ignore Bavail

package updater

import (
	"fmt"
	"syscall"
)

// AvailableDiskBytes 返回 path 所在挂载分区的可用字节数。
func AvailableDiskBytes(path string) (uint64, error) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0, fmt.Errorf("statfs %s: %w", path, err)
	}
	return stat.Bavail * uint64(stat.Bsize), nil
}
