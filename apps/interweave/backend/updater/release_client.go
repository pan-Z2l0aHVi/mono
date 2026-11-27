package updater

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

const (
	defaultAPIBaseURL    = "https://api.github.com"
	defaultRepository    = "pan-Z2l0aHVi/mono"
	maxReleasePages      = 5
	releasesPerPage      = 100
	maxChecksumsBytes    = 1 << 20   // 1 MiB
	maxInstallerBytes    = 512 << 20 // 512 MiB
	checkTimeout         = 15 * time.Second
	downloadIdleTimeout  = 30 * time.Second
	releaseCacheSchema   = 1
	releaseCacheFileName = "release-cache.json"
	updaterUserAgent     = "Interweave-Updater/1.0"
)

var (
	// ErrRateLimited 表示 GitHub API 触发匿名限流（HTTP 403/429）。
	ErrRateLimited = errors.New("GitHub API 请求频率超限，请稍后重试或直接打开发布页下载")
	// ErrNoReleaseFound 表示翻页上限内未检索到任何 interweave-v* 正式版 Release。
	ErrNoReleaseFound = errors.New("未在最近发布记录中找到 Interweave 正式版，请打开发布页确认")
	// ErrIncompleteRelease 表示最新版本缺少当前平台安装包或 checksums.txt（可能正在发布上传中）。
	ErrIncompleteRelease = errors.New("最新版本发布文件尚未上传完整，请稍后重试")
	// ErrInsufficientDiskSpace 表示目标缓存分区可用磁盘空间不足（至少需要 3 倍安装包体积）。
	ErrInsufficientDiskSpace = errors.New("磁盘可用空间不足，请清理空间后重试")
)

var (
	checksumLinePattern = regexp.MustCompile(`^([0-9a-fA-F]{64})[ \t]+\*?(.+)$`)
	linkNextPattern     = regexp.MustCompile(`<([^>]+)>;\s*rel="next"`)
)

// ProxyFunc 与 http.Transport.Proxy 同构，允许注入 backend/native/service.SystemProxy。
type ProxyFunc func(*http.Request) (*url.URL, error)

// ReleaseInfo 表示已筛选、已校验资产完整性的 Interweave 正式版发布信息。
type ReleaseInfo struct {
	Version      SemVer `json:"version"`
	TagName      string `json:"tagName"`
	HTMLURL      string `json:"htmlUrl"`
	Body         string `json:"body"`
	AssetName    string `json:"assetName"`
	AssetURL     string `json:"assetUrl"`
	AssetSize    int64  `json:"assetSize"`
	ChecksumsURL string `json:"checksumsUrl"`
}

// DownloadProgress 描述下载进度回调数据。
type DownloadProgress struct {
	Downloaded int64
	Total      int64
}

type releaseCacheRecord struct {
	SchemaVersion int          `json:"schemaVersion"`
	ETag          string       `json:"etag"`
	LatestRelease *ReleaseInfo `json:"latestRelease"`
	CheckedAt     time.Time    `json:"checkedAt"`
}

type githubReleaseDTO struct {
	TagName    string           `json:"tag_name"`
	HTMLURL    string           `json:"html_url"`
	Body       string           `json:"body"`
	Draft      bool             `json:"draft"`
	Prerelease bool             `json:"prerelease"`
	Assets     []githubAssetDTO `json:"assets"`
}

type githubAssetDTO struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

// ReleaseClientOptions 配置 GitHub Releases 检查与下载客户端。
type ReleaseClientOptions struct {
	Repository      string
	APIBaseURL      string
	GOOS            string
	GOARCH          string
	CacheDir        string
	Proxy           ProxyFunc
	DiskSpace       func(path string) (uint64, error)
	AllowCustomHost bool // 仅用于本地 httptest 单测；生产环境始终为 false
}

// ReleaseClient 负责从 GitHub Releases 检索最新稳定版并下载校验安装包。
type ReleaseClient struct {
	repo            string
	apiBaseURL      string
	goos            string
	goarch          string
	cacheDir        string
	checkClient     *http.Client
	downloadClient  *http.Client
	diskSpace       func(path string) (uint64, error)
	allowCustomHost bool
}

// NewReleaseClient 创建 GitHub Releases 客户端，默认强制 HTTPS 与重定向域白名单。
func NewReleaseClient(opts ReleaseClientOptions) *ReleaseClient {
	repo := strings.TrimSpace(opts.Repository)
	if repo == "" {
		repo = defaultRepository
	}
	baseURL := strings.TrimRight(strings.TrimSpace(opts.APIBaseURL), "/")
	if baseURL == "" {
		baseURL = defaultAPIBaseURL
	}
	diskFn := opts.DiskSpace
	if diskFn == nil {
		diskFn = AvailableDiskBytes
	}

	proxyFn := opts.Proxy
	if proxyFn == nil {
		proxyFn = http.ProxyFromEnvironment
	} else {
		systemProxy := proxyFn
		proxyFn = func(req *http.Request) (*url.URL, error) {
			if u, err := systemProxy(req); err == nil && u != nil {
				return u, nil
			}
			return http.ProxyFromEnvironment(req)
		}
	}

	transport := &http.Transport{
		Proxy: proxyFn,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 15 * time.Second,
		IdleConnTimeout:       60 * time.Second,
	}

	c := &ReleaseClient{
		repo:            repo,
		apiBaseURL:      baseURL,
		goos:            opts.GOOS,
		goarch:          opts.GOARCH,
		cacheDir:        opts.CacheDir,
		diskSpace:       diskFn,
		allowCustomHost: opts.AllowCustomHost,
	}

	checkRedirect := c.validateRedirect
	c.checkClient = &http.Client{
		Transport:     transport,
		Timeout:       checkTimeout,
		CheckRedirect: checkRedirect,
	}
	// 下载不设总硬超时，通过 context 取消与连接/空闲读取超时控制。
	c.downloadClient = &http.Client{
		Transport:     transport,
		CheckRedirect: checkRedirect,
	}
	return c
}

// ExpectedAssetName 返回给定版本与目标平台的预期发布资产文件名。
func ExpectedAssetName(version SemVer, goos, goarch string) (string, error) {
	switch goos {
	case "darwin":
		if goarch != "" && goarch != "arm64" {
			return "", fmt.Errorf("当前平台架构 %s/%s 暂不支持自动更新", goos, goarch)
		}
		return fmt.Sprintf("interweave-%s-macos-arm64.dmg", version.String()), nil
	case "windows":
		if goarch != "" && goarch != "amd64" {
			return "", fmt.Errorf("当前平台架构 %s/%s 暂不支持自动更新", goos, goarch)
		}
		return fmt.Sprintf("interweave-%s-windows-x64.exe", version.String()), nil
	default:
		return "", fmt.Errorf("当前系统 %s 暂不支持自动更新", goos)
	}
}

func (c *ReleaseClient) validateRedirect(req *http.Request, via []*http.Request) error {
	if len(via) >= 10 {
		return errors.New("too many redirects")
	}
	if !c.isAllowedURL(req.URL) {
		return fmt.Errorf("blocked redirect to untrusted URL: %s", req.URL.String())
	}
	// 跨域重定向时剥离敏感头。
	if len(via) > 0 && !strings.EqualFold(via[len(via)-1].URL.Host, req.URL.Host) {
		req.Header.Del("Authorization")
		req.Header.Del("Cookie")
	}
	return nil
}

func (c *ReleaseClient) isAllowedURL(u *url.URL) bool {
	if u == nil {
		return false
	}
	if c.allowCustomHost {
		return u.Scheme == "http" || u.Scheme == "https"
	}
	if !strings.EqualFold(u.Scheme, "https") {
		return false
	}
	host := strings.ToLower(u.Hostname())
	if host == "github.com" || host == "api.github.com" {
		return true
	}
	// 严格带前导点后缀匹配，防止 evilgithubusercontent.com 绕过。
	return strings.HasSuffix(host, ".githubusercontent.com")
}

// FetchLatestStable 分页拉取 GitHub Releases 并返回语义化版本最高的 Interweave 正式稳定版。
func (c *ReleaseClient) FetchLatestStable(ctx context.Context) (*ReleaseInfo, error) {
	cached := c.loadCache()
	nextURL := fmt.Sprintf("%s/repos/%s/releases?per_page=%d", c.apiBaseURL, c.repo, releasesPerPage)

	var (
		bestDTO     *githubReleaseDTO
		bestVersion SemVer
		firstETag   string
	)

	for page := 1; page <= maxReleasePages && nextURL != ""; page++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, nextURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("User-Agent", updaterUserAgent)
		// 仅当第 1 页且磁盘存在有效快照时才携带 If-None-Match。
		if page == 1 && cached != nil && cached.ETag != "" && cached.LatestRelease != nil {
			req.Header.Set("If-None-Match", cached.ETag)
		}

		resp, err := c.checkClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("请求更新信息失败: %w", err)
		}

		if page == 1 && resp.StatusCode == http.StatusNotModified && cached != nil && cached.LatestRelease != nil {
			resp.Body.Close()
			cp := *cached.LatestRelease
			return &cp, nil
		}

		if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			return nil, ErrRateLimited
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("检查更新返回异常状态码: HTTP %d", resp.StatusCode)
		}

		if page == 1 {
			firstETag = strings.TrimSpace(resp.Header.Get("ETag"))
		}

		body, err := readLimited(resp.Body, 8<<20)
		linkHeader := resp.Header.Get("Link")
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("读取更新列表失败: %w", err)
		}

		var releases []githubReleaseDTO
		if err := json.Unmarshal(body, &releases); err != nil {
			return nil, fmt.Errorf("解析更新列表失败: %w", err)
		}

		for i := range releases {
			rel := &releases[i]
			if rel.Draft || rel.Prerelease {
				continue
			}
			ver, ok := ParseInterweaveReleaseTag(rel.TagName)
			if !ok {
				continue
			}
			if bestDTO == nil || ver.Compare(bestVersion) > 0 {
				bestVersion = ver
				cp := *rel
				bestDTO = &cp
			}
		}

		nextURL = parseNextLink(linkHeader)
	}

	if bestDTO == nil {
		return nil, ErrNoReleaseFound
	}

	info, err := c.buildReleaseInfo(bestDTO, bestVersion)
	if err != nil {
		return nil, err
	}
	if firstETag != "" {
		c.saveCache(firstETag, info)
	}
	return info, nil
}

func (c *ReleaseClient) buildReleaseInfo(dto *githubReleaseDTO, version SemVer) (*ReleaseInfo, error) {
	wantAsset, err := ExpectedAssetName(version, c.goos, c.goarch)
	if err != nil {
		return nil, err
	}

	var (
		assetURL     string
		assetSize    int64
		checksumsURL string
	)
	for _, a := range dto.Assets {
		switch a.Name {
		case wantAsset:
			assetURL = a.BrowserDownloadURL
			assetSize = a.Size
		case "checksums.txt":
			checksumsURL = a.BrowserDownloadURL
		}
	}
	if assetURL == "" || checksumsURL == "" {
		return nil, ErrIncompleteRelease
	}
	parsedAsset, err := url.Parse(assetURL)
	if err != nil || !c.isAllowedURL(parsedAsset) {
		return nil, fmt.Errorf("安装包下载地址不受信任: %q", assetURL)
	}
	parsedChecksums, err := url.Parse(checksumsURL)
	if err != nil || !c.isAllowedURL(parsedChecksums) {
		return nil, fmt.Errorf("校验文件下载地址不受信任: %q", checksumsURL)
	}

	return &ReleaseInfo{
		Version:      version,
		TagName:      dto.TagName,
		HTMLURL:      dto.HTMLURL,
		Body:         dto.Body,
		AssetName:    wantAsset,
		AssetURL:     assetURL,
		AssetSize:    assetSize,
		ChecksumsURL: checksumsURL,
	}, nil
}

// DownloadAndVerify 下载同一 Release 的 checksums.txt 与平台安装包，并完成 SHA-256 严格校验。
// 返回落盘后的本地文件路径与期望 SHA-256（小写 64 位十六进制）。
func (c *ReleaseClient) DownloadAndVerify(
	ctx context.Context,
	info *ReleaseInfo,
	sessionDir string,
	onProgress func(DownloadProgress),
) (filePath string, expectedSHA256 string, err error) {
	if info == nil {
		return "", "", errors.New("release info is nil")
	}
	if err := EnsureExclusiveDir(sessionDir); err != nil {
		return "", "", err
	}

	// 下载前预检磁盘空间：至少预留 3 倍安装包体积（覆盖下载、解压/挂载与原子备份）。
	if info.AssetSize > 0 && c.diskSpace != nil {
		if avail, diskErr := c.diskSpace(sessionDir); diskErr == nil {
			needed := uint64(info.AssetSize) * 3
			if avail < needed {
				return "", "", ErrInsufficientDiskSpace
			}
		}
	}

	// 1. 下载并解析 checksums.txt（严格限制 ≤ 1 MiB）。
	checksumBytes, err := c.downloadBytes(ctx, info.ChecksumsURL, maxChecksumsBytes)
	if err != nil {
		return "", "", fmt.Errorf("下载校验文件失败: %w", err)
	}
	expectedSHA256, err = ParseChecksumForFile(string(checksumBytes), info.AssetName)
	if err != nil {
		return "", "", fmt.Errorf("解析校验文件失败: %w", err)
	}

	// 2. 流式下载安装包到独占 session 目录并同步计算 SHA-256。
	destPath := filepath.Join(sessionDir, filepath.Base(info.AssetName))
	if err := c.streamDownloadAndHash(ctx, info.AssetURL, destPath, info.AssetSize, expectedSHA256, onProgress); err != nil {
		_ = os.Remove(destPath)
		return "", "", err
	}
	return destPath, expectedSHA256, nil
}

func (c *ReleaseClient) downloadBytes(ctx context.Context, targetURL string, limit int64) ([]byte, error) {
	parsed, err := url.Parse(targetURL)
	if err != nil || !c.isAllowedURL(parsed) {
		return nil, fmt.Errorf("blocked untrusted URL: %s", targetURL)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", updaterUserAgent)
	resp, err := c.checkClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
		return nil, ErrRateLimited
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return readLimited(resp.Body, limit)
}

func (c *ReleaseClient) streamDownloadAndHash(
	ctx context.Context,
	targetURL string,
	destPath string,
	hintTotal int64,
	expectedSHA256 string,
	onProgress func(DownloadProgress),
) error {
	parsed, err := url.Parse(targetURL)
	if err != nil || !c.isAllowedURL(parsed) {
		return fmt.Errorf("blocked untrusted download URL: %s", targetURL)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", updaterUserAgent)

	resp, err := c.downloadClient.Do(req)
	if err != nil {
		return fmt.Errorf("下载安装包失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden || resp.StatusCode == http.StatusTooManyRequests {
		return ErrRateLimited
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载安装包返回异常状态码: HTTP %d", resp.StatusCode)
	}

	total := resp.ContentLength
	if total <= 0 {
		total = hintTotal
	}
	if total > maxInstallerBytes {
		return fmt.Errorf("安装包体积超出安全上限（%d 字节）", total)
	}

	out, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return fmt.Errorf("创建临时安装包失败: %w", err)
	}
	defer out.Close()

	hasher := sha256.New()
	limited := io.LimitReader(resp.Body, maxInstallerBytes+1)
	buf := make([]byte, 32*1024)
	var downloaded int64
	lastReport := time.Time{}

	for {
		n, readErr := readWithIdleTimeout(ctx, limited, buf, downloadIdleTimeout)
		if n > 0 {
			downloaded += int64(n)
			if downloaded > maxInstallerBytes {
				return errors.New("安装包体积超出 512 MB 安全上限，已中止下载")
			}
			if _, writeErr := out.Write(buf[:n]); writeErr != nil {
				return fmt.Errorf("写入安装包失败: %w", writeErr)
			}
			_, _ = hasher.Write(buf[:n])
			if onProgress != nil && (time.Since(lastReport) >= 100*time.Millisecond || (total > 0 && downloaded >= total)) {
				lastReport = time.Now()
				onProgress(DownloadProgress{Downloaded: downloaded, Total: total})
			}
		}
		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				break
			}
			return fmt.Errorf("下载中断: %w", readErr)
		}
	}

	if err := out.Sync(); err != nil {
		return fmt.Errorf("刷新安装包落盘失败: %w", err)
	}
	if onProgress != nil {
		onProgress(DownloadProgress{Downloaded: downloaded, Total: total})
	}

	actual := hex.EncodeToString(hasher.Sum(nil))
	if actual != strings.ToLower(expectedSHA256) {
		return fmt.Errorf("安装包 SHA-256 校验失败（文件可能已损坏或被篡改）")
	}
	return nil
}

func readWithIdleTimeout(ctx context.Context, r io.Reader, buf []byte, idleTimeout time.Duration) (int, error) {
	type readResult struct {
		n   int
		err error
	}
	ch := make(chan readResult, 1)
	go func() {
		n, err := r.Read(buf)
		ch <- readResult{n: n, err: err}
	}()

	timer := time.NewTimer(idleTimeout)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return 0, ctx.Err()
	case <-timer.C:
		return 0, errors.New("下载连接长时间无响应（超时）")
	case res := <-ch:
		return res.n, res.err
	}
}

// ParseChecksumForFile 按行严格解析 checksums.txt，规范化 "./" 前缀后要求目标文件名精确唯一命中。
func ParseChecksumForFile(content string, targetFileName string) (string, error) {
	want := strings.TrimPrefix(strings.TrimSpace(targetFileName), "./")
	if want == "" {
		return "", errors.New("empty target filename")
	}

	var matched string
	hits := 0
	for _, rawLine := range strings.Split(strings.ReplaceAll(content, "\r\n", "\n"), "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			continue
		}
		m := checksumLinePattern.FindStringSubmatch(line)
		if m == nil {
			return "", fmt.Errorf("checksums.txt 存在非法行格式: %q", line)
		}
		digest := strings.ToLower(m[1])
		name := strings.TrimPrefix(strings.TrimSpace(m[2]), "./")
		if name == want {
			matched = digest
			hits++
		}
	}

	if hits == 0 {
		return "", fmt.Errorf("checksums.txt 中未找到 %q 的校验摘要", want)
	}
	if hits > 1 {
		return "", fmt.Errorf("checksums.txt 中 %q 出现重复条目", want)
	}
	return matched, nil
}

func readLimited(r io.Reader, limit int64) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(r, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > limit {
		return nil, fmt.Errorf("响应体超出安全大小上限（%d 字节）", limit)
	}
	return data, nil
}

func parseNextLink(linkHeader string) string {
	if linkHeader == "" {
		return ""
	}
	m := linkNextPattern.FindStringSubmatch(linkHeader)
	if len(m) < 2 {
		return ""
	}
	return strings.TrimSpace(m[1])
}

func (c *ReleaseClient) cachePath() string {
	if strings.TrimSpace(c.cacheDir) == "" {
		return ""
	}
	return filepath.Join(c.cacheDir, releaseCacheFileName)
}

func (c *ReleaseClient) loadCache() *releaseCacheRecord {
	path := c.cachePath()
	if path == "" {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var rec releaseCacheRecord
	if err := json.Unmarshal(data, &rec); err != nil {
		return nil
	}
	if rec.SchemaVersion != releaseCacheSchema || rec.LatestRelease == nil || rec.ETag == "" {
		return nil
	}
	return &rec
}

func (c *ReleaseClient) saveCache(etag string, info *ReleaseInfo) {
	path := c.cachePath()
	if path == "" || etag == "" || info == nil {
		return
	}
	rec := releaseCacheRecord{
		SchemaVersion: releaseCacheSchema,
		ETag:          etag,
		LatestRelease: info,
		CheckedAt:     time.Now().UTC(),
	}
	data, err := json.MarshalIndent(rec, "", "  ")
	if err != nil {
		return
	}
	_ = WriteFileAtomic(path, data)
}
