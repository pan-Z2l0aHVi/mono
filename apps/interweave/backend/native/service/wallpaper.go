package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// StreamFetcher 是壁纸下载用的流式读取口：HTTP 边界在 remote，native 只持有一个注入的函数，
// 不 import remote。实现方负责超时预算（remote.Fetcher 的 10 秒总时限）。
type StreamFetcher func(ctx context.Context, url string) (io.ReadCloser, error)

type wallpaperApplier func(ctx context.Context, path string) error

type OSServiceOption func(*OSService)

// WithStreamFetcher 注入壁纸下载的流式读取。main.go 装配；nil 时远程壁纸不可用。
func WithStreamFetcher(fetcher StreamFetcher) OSServiceOption {
	return func(s *OSService) { s.streamFetcher = fetcher }
}

// WithWallpaperCacheDir 指定远程壁纸的缓存目录；main.go 按应用数据目录装配。
func WithWallpaperCacheDir(dir string) OSServiceOption {
	return func(s *OSService) { s.wallpaperCacheDir = dir }
}

// withWallpaperApplier 注入包内壁纸设置 seam，供单测隔离宿主桌面且不进入 Wails bindings。
func withWallpaperApplier(applier wallpaperApplier) OSServiceOption {
	return func(s *OSService) { s.wallpaperApplier = applier }
}

/*
 * SetWallpaper 把一张图像设为桌面壁纸（用户在右键菜单主动触发的受控 OS 入口）。
 *
 * location 是 file 来源的原始路径或 url 来源的原始链接。remote 为 true 时先经注入的
 * StreamFetcher 流式下载到壁纸缓存目录（按链接哈希缓存，不落临时目录之外的地方），
 * 再从缓存文件设置；为 false 时直接使用原路径——Interweave 引用外部内容而不接管它，
 * 设置壁纸不复制、不移动、不修改来源文件本身。
 */
func (s *OSService) SetWallpaper(ctx context.Context, location string, remote bool) error {
	if strings.TrimSpace(location) == "" {
		return fmt.Errorf("wallpaper: location is empty")
	}
	path := location
	if remote {
		downloaded, err := s.downloadWallpaper(ctx, location)
		if err != nil {
			return err
		}
		path = downloaded
	} else if info, err := os.Stat(path); err != nil {
		return fmt.Errorf("wallpaper: source file is unreadable: %w", err)
	} else if info.IsDir() {
		return fmt.Errorf("wallpaper: source is a directory")
	}
	applier := s.wallpaperApplier
	if applier == nil {
		applier = setWallpaperFromFile
	}
	return applier(ctx, path)
}

// wallpaperExtPattern 收敛缓存文件扩展名：只留字母数字点，防路径拼接意外。
var wallpaperExtPattern = regexp.MustCompile(`^[A-Za-z0-9.]{1,8}$`)

func wallpaperCacheName(location string) string {
	digest := sha256.Sum256([]byte(location))
	name := hex.EncodeToString(digest[:8])
	ext := ""
	if parsed, err := url.Parse(location); err == nil {
		ext = strings.ToLower(filepath.Ext(parsed.Path))
	}
	if !wallpaperExtPattern.MatchString(ext) || ext == "." {
		ext = ".png"
	}
	return name + ext
}

func (s *OSService) downloadWallpaper(ctx context.Context, location string) (string, error) {
	if s.streamFetcher == nil {
		return "", fmt.Errorf("wallpaper: downloader is not available")
	}
	if s.wallpaperCacheDir == "" {
		return "", fmt.Errorf("wallpaper: cache directory is not configured")
	}
	if err := os.MkdirAll(s.wallpaperCacheDir, 0o755); err != nil {
		return "", fmt.Errorf("wallpaper: prepare cache directory: %w", err)
	}
	final := filepath.Join(s.wallpaperCacheDir, wallpaperCacheName(location))
	if _, err := os.Stat(final); err == nil {
		// 同一链接已有缓存：壁纸是引用式展示，不追远端内容变化，命中即用。
		return final, nil
	}

	reader, err := s.streamFetcher(ctx, location)
	if err != nil {
		return "", fmt.Errorf("wallpaper: download failed: %w", err)
	}
	defer reader.Close()

	temp, err := os.CreateTemp(s.wallpaperCacheDir, "wallpaper-*.part")
	if err != nil {
		return "", fmt.Errorf("wallpaper: create temp file: %w", err)
	}
	tempPath := temp.Name()
	_, copyErr := io.Copy(temp, reader)
	closeErr := temp.Close()
	if copyErr != nil || closeErr != nil {
		os.Remove(tempPath)
		return "", fmt.Errorf("wallpaper: save download: %v", firstError(copyErr, closeErr))
	}
	// 临时文件原子改名成缓存名：中断不会留下半个壁纸文件被误用。
	if err := os.Rename(tempPath, final); err != nil {
		os.Remove(tempPath)
		return "", fmt.Errorf("wallpaper: finalize cache file: %w", err)
	}
	return final, nil
}

func firstError(errs ...error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}
