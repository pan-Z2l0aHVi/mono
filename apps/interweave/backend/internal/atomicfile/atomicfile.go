// Package atomicfile 提供「临时文件 + rename」的原子落盘：读侧永远要么见到旧内容，
// 要么见到完整的新内容，不会读到写了一半的文件。
package atomicfile

import (
	"fmt"
	"os"
	"path/filepath"
)

// WriteFile 把 data 写到 path：先在同目录建临时文件，写完关闭后 rename 覆盖目标。
// 同目录是 rename 跨文件系统失效的前提，临时文件因此不能放进系统临时目录。
// 失败时清理临时文件，保留原始错误原因。
func WriteFile(path string, data []byte, perm os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), "."+filepath.Base(path)+"-*")
	if err != nil {
		return fmt.Errorf("create temp file for %s: %w", path, err)
	}
	tmpName := tmp.Name()
	cleanup := func() { _ = os.Remove(tmpName) }

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		cleanup()
		return fmt.Errorf("write temp file for %s: %w", path, err)
	}
	if err := tmp.Chmod(perm); err != nil {
		tmp.Close()
		cleanup()
		return fmt.Errorf("chmod temp file for %s: %w", path, err)
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return fmt.Errorf("close temp file for %s: %w", path, err)
	}
	if err := os.Rename(tmpName, path); err != nil {
		cleanup()
		return fmt.Errorf("rename temp file onto %s: %w", path, err)
	}
	return nil
}
