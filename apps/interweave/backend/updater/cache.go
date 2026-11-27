package updater

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	sessionDirPrefix = "session-"
	staleSessionAge  = 24 * time.Hour
)

// DefaultCacheDir 返回更新器独占的用户级缓存目录（绝不使用 /tmp 或 %TEMP% 固定共享路径）：
//   - macOS: ~/Library/Caches/Interweave/updater (0700)
//   - Windows: %LOCALAPPDATA%\Interweave\Updater
//   - Linux/其他: $XDG_CACHE_HOME/Interweave/updater
func DefaultCacheDir() (string, error) {
	return defaultCacheDirFor(runtime.GOOS, os.UserHomeDir, os.Getenv, os.UserCacheDir)
}

func defaultCacheDirFor(
	goos string,
	userHome func() (string, error),
	getenv func(string) string,
	userCache func() (string, error),
) (string, error) {
	switch goos {
	case "darwin":
		home, err := userHome()
		if err != nil {
			return "", fmt.Errorf("resolve home directory: %w", err)
		}
		return filepath.Join(home, "Library", "Caches", "Interweave", "updater"), nil
	case "windows":
		localAppData := strings.TrimSpace(getenv("LOCALAPPDATA"))
		if localAppData != "" {
			return filepath.Join(localAppData, "Interweave", "Updater"), nil
		}
		cacheDir, err := userCache()
		if err != nil {
			return "", fmt.Errorf("resolve local appdata directory: %w", err)
		}
		return filepath.Join(cacheDir, "Interweave", "Updater"), nil
	default:
		cacheDir, err := userCache()
		if err != nil {
			return "", fmt.Errorf("resolve user cache directory: %w", err)
		}
		return filepath.Join(cacheDir, "Interweave", "updater"), nil
	}
}

// EnsureExclusiveDir 创建并收紧独占缓存目录权限（Unix 下 0700）。
func EnsureExclusiveDir(dir string) error {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("create exclusive updater dir %s: %w", dir, err)
	}
	if runtime.GOOS != "windows" {
		_ = os.Chmod(dir, 0o700)
	}
	return nil
}

// VerifyFileSHA256 流式计算文件 SHA-256 并与期望的 64 位十六进制摘要严格比对。
func VerifyFileSHA256(path string, expectedHex string) error {
	expected := strings.ToLower(strings.TrimSpace(expectedHex))
	if len(expected) != 64 {
		return fmt.Errorf("invalid expected sha256 digest length: %d", len(expected))
	}
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open file for sha256 verification: %w", err)
	}
	defer f.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, f); err != nil {
		return fmt.Errorf("hash file %s: %w", path, err)
	}
	actual := hex.EncodeToString(hasher.Sum(nil))
	if actual != expected {
		return fmt.Errorf("sha256 mismatch: expected %s, got %s", expected, actual)
	}
	return nil
}

// CleanupStaleSessions 清理缓存根目录下过期的历史 session 目录（跳过 activeSessionDir）。
func CleanupStaleSessions(cacheRoot string, activeSessionDir string, maxAge time.Duration) error {
	if strings.TrimSpace(cacheRoot) == "" {
		return nil
	}
	entries, err := os.ReadDir(cacheRoot)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	now := time.Now()
	cleanActive := ""
	if activeSessionDir != "" {
		cleanActive = filepath.Clean(activeSessionDir)
	}
	for _, entry := range entries {
		if !entry.IsDir() || !strings.HasPrefix(entry.Name(), sessionDirPrefix) {
			continue
		}
		fullPath := filepath.Join(cacheRoot, entry.Name())
		if cleanActive != "" && filepath.Clean(fullPath) == cleanActive {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if maxAge > 0 && now.Sub(info.ModTime()) < maxAge {
			continue
		}
		_ = os.RemoveAll(fullPath)
	}
	return nil
}

// WriteFileAtomic 通过同目录临时文件 + Rename 原子写入私有文件（0600）。
func WriteFileAtomic(path string, data []byte) error {
	dir := filepath.Dir(path)
	if err := EnsureExclusiveDir(dir); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(dir, ".tmp-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	cleanup := true
	defer func() {
		if cleanup {
			_ = os.Remove(tmpPath)
		}
	}()
	if runtime.GOOS != "windows" {
		_ = tmp.Chmod(0o600)
	}
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return err
	}
	cleanup = false
	return nil
}
