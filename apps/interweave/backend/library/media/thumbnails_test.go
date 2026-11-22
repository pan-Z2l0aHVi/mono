package media

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// newThumbnailHandler 建带缩略图缓存目录的 handler，缓存目录随用例销毁。
func newThumbnailHandler(t *testing.T, db *storage.DB) *Handler {
	t.Helper()
	thumbs, err := NewThumbnailStore(filepath.Join(t.TempDir(), "thumbnails"))
	if err != nil {
		t.Fatalf("create thumbnail store: %v", err)
	}
	handler := NewHandler(storage.SourceStore{}, db.SqlDB(), NewPendingPreviewRegistry(), thumbs, nil)
	t.Cleanup(handler.Close)
	return handler
}

// gradientImage 产出 w×h 的渐变图，供只需要结构断言（尺寸、可解码性）的用例使用。
func gradientImage(width, height int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.SetRGBA(x, y, color.RGBA{R: uint8(x * 37), G: uint8(y * 53), B: 90, A: 255})
		}
	}
	return img
}

func mustJPEG(t *testing.T, img image.Image) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}
	return buf.Bytes()
}

// jpegWithOrientation 在编码结果头部插入 EXIF APP1 段，只含方向标签。
func jpegWithOrientation(t *testing.T, img image.Image, orientation uint16) []byte {
	t.Helper()
	base := mustJPEG(t, img)
	tiff := []byte{
		'M', 'M', 0, 42, // big-endian, magic 42
		0, 0, 0, 8, // IFD0 偏移
		0, 1, // 条目数 1
		0x01, 0x12, // Orientation
		0, 3, // SHORT
		0, 0, 0, 1, // count
		0, byte(orientation), 0, 0, // 内联值
		0, 0, 0, 0, // 下一 IFD 偏移（无）
	}
	app1 := append([]byte("Exif\x00\x00"), tiff...)
	segment := []byte{0xFF, 0xE1, byte((len(app1) + 2) >> 8), byte((len(app1) + 2) & 0xFF)}
	out := append([]byte{0xFF, 0xD8}, segment...)
	out = append(out, app1...)
	return append(out, base[2:]...)
}

func insertFileSource(t *testing.T, db *storage.DB, id string, location string) {
	t.Helper()
	now := int64(1_700_000_000_000)
	insertSource(t, db, storage.SourceModel{
		ID: id, ResourceID: "resource-" + id, Type: storage.SourceTypeFile,
		Location: location, Available: true, IsPreferred: true, CreatedAt: now, UpdatedAt: now,
	})
}

func TestThumbnailRouteGeneratesAndCaches(t *testing.T) {
	db := openTestDB(t)
	original := filepath.Join(t.TempDir(), "photo.jpg")
	if err := os.WriteFile(original, mustJPEG(t, gradientImage(1200, 800)), 0o600); err != nil {
		t.Fatalf("write original: %v", err)
	}
	insertFileSource(t, db, "source-photo", original)
	handler := newThumbnailHandler(t, db)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-photo", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", response.Code, response.Body.String())
	}
	if contentType := response.Header().Get("Content-Type"); contentType != "image/jpeg" {
		t.Fatalf("expected image/jpeg, got %q", contentType)
	}
	if etag := response.Header().Get("ETag"); etag == "" {
		t.Fatal("expected ETag on generated thumbnail")
	}
	decoded, format, err := image.Decode(bytes.NewReader(response.Body.Bytes()))
	if err != nil || format != "jpeg" {
		t.Fatalf("response is not a decodable jpeg: %v (%s)", err, format)
	}
	bounds := decoded.Bounds()
	if max(bounds.Dx(), bounds.Dy()) != thumbnailMaxEdge {
		t.Fatalf("expected longest edge %d, got %dx%d", thumbnailMaxEdge, bounds.Dx(), bounds.Dy())
	}

	// 协商：携带同一 ETag 的 If-None-Match 应得到 304。
	conditional := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-photo", nil)
	request.Header.Set("If-None-Match", response.Header().Get("ETag"))
	handler.ServeHTTP(conditional, request)
	if conditional.Code != http.StatusNotModified {
		t.Fatalf("expected 304 for matching ETag, got %d", conditional.Code)
	}
}

func TestThumbnailRouteAppliesEXIFOrientation(t *testing.T) {
	// 2×3 个 8×8 实色块 + 方向 6（顺时针 90°）：输出应为 3×2 块、块序 [E C A / F D B]。
	// 用色块而不是单像素：JPEG 的色度子采样会糊掉单像素颜色，块级颜色才经得起有损往返。
	const block = 8
	palette := []color.RGBA{
		{R: 220, G: 30, B: 30, A: 255},  // A
		{R: 30, G: 220, B: 30, A: 255},  // B
		{R: 30, G: 30, B: 220, A: 255},  // C
		{R: 220, G: 220, B: 30, A: 255}, // D
		{R: 30, G: 220, B: 220, A: 255}, // E
		{R: 220, G: 30, B: 220, A: 255}, // F
	}
	img := image.NewRGBA(image.Rect(0, 0, 2*block, 3*block))
	for by := 0; by < 3; by++ {
		for bx := 0; bx < 2; bx++ {
			for y := 0; y < block; y++ {
				for x := 0; x < block; x++ {
					img.SetRGBA(bx*block+x, by*block+y, palette[by*2+bx])
				}
			}
		}
	}

	original := filepath.Join(t.TempDir(), "portrait.jpg")
	if err := os.WriteFile(original, jpegWithOrientation(t, img, 6), 0o600); err != nil {
		t.Fatalf("write original: %v", err)
	}
	oriented, err := buildThumbnail(original)
	if err != nil {
		t.Fatalf("build thumbnail: %v", err)
	}
	decoded, err := jpeg.Decode(bytes.NewReader(oriented))
	if err != nil {
		t.Fatalf("decode thumbnail: %v", err)
	}
	bounds := decoded.Bounds()
	if bounds.Dx() != 3*block || bounds.Dy() != 2*block {
		t.Fatalf("expected %dx%d after orientation 6, got %dx%d", 3*block, 2*block, bounds.Dx(), bounds.Dy())
	}

	// want[by][bx] 是输出块 (bx, by) 对应的输入块下标：in(y, h-1-x) 的块级展开。
	want := [][]int{{4, 2, 0}, {5, 3, 1}}
	for by := 0; by < 2; by++ {
		for bx := 0; bx < 3; bx++ {
			// JPEG 解码给出 YCbCr，统一经 color.Color 接口取 8bit 值。
			r, g, b, _ := decoded.At(bx*block+block/2, by*block+block/2).RGBA()
			best, bestDistance := 0, math.MaxFloat64
			for index, candidate := range palette {
				distance := square(float64(uint8(r>>8))-float64(candidate.R)) +
					square(float64(uint8(g>>8))-float64(candidate.G)) +
					square(float64(uint8(b>>8))-float64(candidate.B))
				if distance < bestDistance {
					best, bestDistance = index, distance
				}
			}
			if best != want[by][bx] {
				t.Fatalf("block(%d,%d): expected palette %d, got %d (rgb=%d,%d,%d)",
					bx, by, want[by][bx], best, uint8(r>>8), uint8(g>>8), uint8(b>>8))
			}
		}
	}
}

func square(v float64) float64 { return v * v }

func TestApplyOrientationTable(t *testing.T) {
	// in = [A B / C D / E F]（2×3），R 通道逐像素 0..185。方向表是手算矩阵，
	// 防止 5/7 这类罕见档位的映射写反。
	in := image.NewRGBA(image.Rect(0, 0, 2, 3))
	labels := []uint8{0, 37, 74, 111, 148, 185}
	for index, value := range labels {
		in.SetRGBA(index%2, index/2, color.RGBA{R: value, A: 255})
	}
	cases := []struct {
		orientation uint16
		want        []uint8 // 逐像素 R 值，行优先
		wantW       int
		wantH       int
	}{
		{2, []uint8{37, 0, 111, 74, 185, 148}, 2, 3}, // 水平镜像
		{3, []uint8{185, 148, 111, 74, 37, 0}, 2, 3}, // 旋转 180°
		{4, []uint8{148, 185, 74, 111, 0, 37}, 2, 3}, // 垂直镜像
		{5, []uint8{0, 74, 148, 37, 111, 185}, 3, 2}, // 转置
		{6, []uint8{148, 74, 0, 185, 111, 37}, 3, 2}, // 顺时针 90°
		{7, []uint8{185, 111, 37, 148, 74, 0}, 3, 2}, // 反转置
		{8, []uint8{37, 111, 185, 0, 74, 148}, 3, 2}, // 逆时针 90°
	}
	for _, testCase := range cases {
		out := applyOrientation(in, testCase.orientation)
		bounds := out.Bounds()
		if bounds.Dx() != testCase.wantW || bounds.Dy() != testCase.wantH {
			t.Fatalf("orientation %d: expected %dx%d, got %dx%d",
				testCase.orientation, testCase.wantW, testCase.wantH, bounds.Dx(), bounds.Dy())
		}
		for y := 0; y < bounds.Dy(); y++ {
			for x := 0; x < bounds.Dx(); x++ {
				r, _, _, _ := out.At(x, y).RGBA()
				if uint8(r>>8) != testCase.want[y*bounds.Dx()+x] {
					t.Fatalf("orientation %d pixel(%d,%d): expected %d, got %d",
						testCase.orientation, x, y, testCase.want[y*bounds.Dx()+x], uint8(r>>8))
				}
			}
		}
	}
}

func TestThumbnailRouteUnsupportedFormatReturns404(t *testing.T) {
	db := openTestDB(t)
	original := filepath.Join(t.TempDir(), "shot.heic")
	if err := os.WriteFile(original, []byte("not a decodable image"), 0o600); err != nil {
		t.Fatalf("write original: %v", err)
	}
	insertFileSource(t, db, "source-heic", original)
	handler := newThumbnailHandler(t, db)

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-heic", nil))
	if response.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unsupported format, got %d", response.Code)
	}
	if cacheControl := response.Header().Get("Cache-Control"); cacheControl != "no-store" {
		t.Fatalf("expected no-store on thumbnail miss, got %q", cacheControl)
	}
}

func TestThumbnailRouteSaveAndRejects(t *testing.T) {
	db := openTestDB(t)
	original := filepath.Join(t.TempDir(), "photo.heic")
	if err := os.WriteFile(original, []byte("heic-bytes"), 0o600); err != nil {
		t.Fatalf("write original: %v", err)
	}
	insertFileSource(t, db, "source-captured", original)
	handler := newThumbnailHandler(t, db)

	payload := mustJPEG(t, gradientImage(320, 200))
	post := func(body []byte, contentType string) *httptest.ResponseRecorder {
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, ThumbnailPathPrefix+"source-captured", bytes.NewReader(body))
		request.Header.Set("Content-Type", contentType)
		handler.ServeHTTP(response, request)
		return response
	}

	if response := post([]byte("garbage"), "image/jpeg"); response.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("expected 415 for non-jpeg payload, got %d", response.Code)
	}
	if response := post(payload, "image/jpeg"); response.Code != http.StatusNoContent {
		t.Fatalf("expected 204 for valid capture, got %d", response.Code)
	}

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-captured", nil))
	if response.Code != http.StatusOK || !bytes.Equal(response.Body.Bytes(), payload) {
		t.Fatalf("expected cached capture bytes, got status=%d len=%d", response.Code, response.Body.Len())
	}
}

func TestThumbnailRouteServesOnlyCachedUnavailableSource(t *testing.T) {
	db := openTestDB(t)
	location := filepath.Join(t.TempDir(), "offline.jpg")
	if err := os.WriteFile(location, mustJPEG(t, gradientImage(80, 60)), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	now := int64(1_700_000_000_000)
	insertSource(t, db, storage.SourceModel{
		ID: "source-offline", ResourceID: "resource-offline", Type: storage.SourceTypeFile,
		Location: location, Available: false, IsPreferred: true, CreatedAt: now, UpdatedAt: now,
	})
	handler := newThumbnailHandler(t, db)

	for _, method := range []string{http.MethodGet, http.MethodPost} {
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, httptest.NewRequest(method, ThumbnailPathPrefix+"source-offline", nil))
		if response.Code != http.StatusNotFound {
			t.Fatalf("%s: expected 404 for unavailable source, got %d", method, response.Code)
		}
	}
	info, err := os.Stat(location)
	if err != nil {
		t.Fatal(err)
	}
	payload := mustJPEG(t, gradientImage(80, 60))
	if !handler.thumbs.Save("source-offline", info, payload) {
		t.Fatal("save thumbnail")
	}
	if err := os.Remove(location); err != nil {
		t.Fatal(err)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-offline", nil))
	if response.Code != http.StatusOK || !bytes.Equal(response.Body.Bytes(), payload) {
		t.Fatalf("expected cached thumbnail, got %d", response.Code)
	}
	post := httptest.NewRecorder()
	handler.ServeHTTP(post, httptest.NewRequest(http.MethodPost, ThumbnailPathPrefix+"source-offline", bytes.NewReader(payload)))
	if post.Code != http.StatusNotFound {
		t.Fatalf("expected unavailable POST 404, got %d", post.Code)
	}

}

func TestPruneStaleRemovesOutdatedVersions(t *testing.T) {
	dir := t.TempDir()
	store := &ThumbnailStore{dir: dir}
	current := "current-version"
	stale := "stale-version"
	for _, name := range []string{
		"source-1." + current + ".jpg",
		"source-1." + stale + ".jpg",
		"source-2.oldversion.jpg", // Source 已删除：归属不在名单，删除
		"unattributable.jpg",      // 无点分隔：不动
		"source-3.anything.jpg",   // 名单里版本为空（原文件不可 stat）：保留
	} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o600); err != nil {
			t.Fatalf("write fixture %s: %v", name, err)
		}
	}
	store.pruneStale(context.Background(), []thumbnailPruneEntry{
		{SourceID: "source-1", Version: current},
		{SourceID: "source-3", Version: ""},
	})

	for _, name := range []string{"source-1." + current + ".jpg", "unattributable.jpg", "source-3.anything.jpg"} {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			t.Fatalf("expected %s to survive prune: %v", name, err)
		}
	}
	for _, name := range []string{"source-1." + stale + ".jpg", "source-2.oldversion.jpg"} {
		if _, err := os.Stat(filepath.Join(dir, name)); !os.IsNotExist(err) {
			t.Fatalf("expected %s to be pruned", name)
		}
	}
}

// 缩略图是用户图片的派生数据：落盘权限必须是 owner-only，不能因为数据目录可遍历
// 就让同机其他账号读到缓存。
func TestWriteAtomicallyKeepsOwnerOnlyPermissions(t *testing.T) {
	target := filepath.Join(t.TempDir(), "thumb.jpg")
	if err := writeAtomically(target, []byte("jpeg")); err != nil {
		t.Fatalf("write atomically: %v", err)
	}
	info, err := os.Stat(target)
	if err != nil {
		t.Fatalf("stat thumbnail: %v", err)
	}
	if runtime.GOOS == "windows" {
		// Windows 的 Mode().Perm() 是合成值，不反映 ACL。
		return
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Fatalf("expected owner-only permissions 0600, got %#o", perm)
	}
}

func pruneFixture(t *testing.T) (*ThumbnailStore, string) {
	t.Helper()
	dir := t.TempDir()
	return &ThumbnailStore{dir: dir}, dir
}

func touchThumbnail(t *testing.T, dir, name string) {
	t.Helper()
	if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestPruneKeepsOfflineStalesOutdatedAndDropsDeletedSources(t *testing.T) {
	store, dir := pruneFixture(t)
	present := filepath.Join(t.TempDir(), "a.png")
	if err := os.WriteFile(present, []byte("png"), 0o600); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(present)
	if err != nil {
		t.Fatal(err)
	}
	current := thumbnailVersion(info)
	touchThumbnail(t, dir, "online."+current+".jpg")
	touchThumbnail(t, dir, "online.old.jpg")
	touchThumbnail(t, dir, "offline.whatever.jpg")
	touchThumbnail(t, dir, "deleted.whatever.jpg")

	store.Prune(context.Background(), func(context.Context) ([]storage.SourceModel, error) {
		return []storage.SourceModel{
			{ID: "online", Location: present},
			{ID: "offline", Location: filepath.Join(t.TempDir(), "missing.png")}, // stat 失败：保留
		}, nil
	})

	for _, name := range []string{"online." + current + ".jpg", "offline.whatever.jpg"} {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			t.Fatalf("expected %s to survive: %v", name, err)
		}
	}
	for _, name := range []string{"online.old.jpg", "deleted.whatever.jpg"} {
		if _, err := os.Stat(filepath.Join(dir, name)); !os.IsNotExist(err) {
			t.Fatalf("expected %s to be pruned", name)
		}
	}
}

func TestPruneSkipsEverythingWhenListingFails(t *testing.T) {
	store, dir := pruneFixture(t)
	touchThumbnail(t, dir, "x.v.jpg")

	store.Prune(context.Background(), func(context.Context) ([]storage.SourceModel, error) {
		return nil, errors.New("db down")
	})

	if _, err := os.Stat(filepath.Join(dir, "x.v.jpg")); err != nil {
		t.Fatalf("a failed listing must not prune anything: %v", err)
	}
}

// ---- 离线索引：一次扫描、O(1) 命中、负查询不重扫、CAS 自愈 ----

// serveCached 是包内直调 ServeCachedThumbnail 的便捷封装，返回响应与错误。
func serveCached(t *testing.T, store *ThumbnailStore, sourceID string) (*httptest.ResponseRecorder, error) {
	t.Helper()
	rec := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+sourceID, nil)
	err := store.ServeCachedThumbnail(rec, request, sourceID)
	return rec, err
}

// countDirScans 把 readDirFn 换成对 dir 计数的版本并在用例结束后还原，
// 使「目录被扫描了几次」可以断言。
func countDirScans(t *testing.T, dir string) func() int {
	t.Helper()
	original := readDirFn
	var mu sync.Mutex
	scans := 0
	readDirFn = func(name string) ([]os.DirEntry, error) {
		if name == dir {
			mu.Lock()
			scans++
			mu.Unlock()
		}
		return original(name)
	}
	t.Cleanup(func() { readDirFn = original })
	return func() int {
		mu.Lock()
		defer mu.Unlock()
		return scans
	}
}

// 离线查询必须只扫一次目录：首次调用建立全量索引，此后命中 O(1)、未命中直接
// os.ErrNotExist（非图片源的负查询不再反复遍历）。选「最新」按真实 ModTime
// 而不是文件名字典序。
func TestServeCachedThumbnailBuildsOfflineIndexOnce(t *testing.T) {
	dir := t.TempDir()
	store := &ThumbnailStore{dir: dir}
	touchThumbnail(t, dir, "src-a.1-1.jpg")
	touchThumbnail(t, dir, "src-a.9-9.jpg")
	touchThumbnail(t, dir, "src-b.2-2.jpg")
	// 文件名字典序更大的 9-9 真实 ModTime 更旧：索引必须按时间选出 1-1。
	newerTime := time.Now().Add(time.Hour)
	if err := os.Chtimes(filepath.Join(dir, "src-a.1-1.jpg"), newerTime, newerTime); err != nil {
		t.Fatal(err)
	}
	olderTime := time.Now().Add(-time.Hour)
	if err := os.Chtimes(filepath.Join(dir, "src-a.9-9.jpg"), olderTime, olderTime); err != nil {
		t.Fatal(err)
	}

	scans := countDirScans(t, dir)

	rec, err := serveCached(t, store, "src-a")
	if err != nil {
		t.Fatalf("serve cached thumbnail: %v", err)
	}
	if etag := rec.Header().Get("ETag"); etag != `"src-a.1-1.jpg"` {
		t.Fatalf("latest entry must be picked by real ModTime, got ETag %s", etag)
	}
	if got := scans(); got != 1 {
		t.Fatalf("first offline lookup must scan the directory exactly once, got %d scans", got)
	}

	rec, err = serveCached(t, store, "src-a")
	if err != nil {
		t.Fatalf("serve cached thumbnail again: %v", err)
	}
	if etag := rec.Header().Get("ETag"); etag != `"src-a.1-1.jpg"` {
		t.Fatalf("subsequent lookup must hit the same indexed entry, got ETag %s", etag)
	}

	rec, err = serveCached(t, store, "src-video")
	if !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("post-index miss must fail with os.ErrNotExist, got %v", err)
	}
	if got := scans(); got != 1 {
		t.Fatalf("hits and misses after indexing must not rescan the directory, got %d scans", got)
	}
}

// 最常见的离线形态：在线时前端回填缩略图（索引尚未建立），之后原文件不可用。
// 离线首查按目录全量建索引，必须能看到回填落盘的文件。
func TestSaveBeforeIndexBuildServesOffline(t *testing.T) {
	db := openTestDB(t)
	location := filepath.Join(t.TempDir(), "photo.jpg")
	if err := os.WriteFile(location, mustJPEG(t, gradientImage(80, 60)), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	now := int64(1_700_000_000_000)
	insertSource(t, db, storage.SourceModel{
		ID: "source-backfill", ResourceID: "resource-backfill", Type: storage.SourceTypeFile,
		Location: location, Available: false, IsPreferred: true, CreatedAt: now, UpdatedAt: now,
	})
	handler := newThumbnailHandler(t, db)

	info, err := os.Stat(location)
	if err != nil {
		t.Fatal(err)
	}
	payload := mustJPEG(t, gradientImage(80, 60))
	if !handler.thumbs.Save("source-backfill", info, payload) {
		t.Fatal("save thumbnail")
	}
	if err := os.Remove(location); err != nil {
		t.Fatal(err)
	}

	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-backfill", nil))
	if response.Code != http.StatusOK || !bytes.Equal(response.Body.Bytes(), payload) {
		t.Fatalf("expected the saved thumbnail to be served offline, got status=%d len=%d", response.Code, response.Body.Len())
	}
}

// 索引指向的缓存文件被外部清理时必须自愈：CAS 移除条目后按 os.ErrNotExist 收尾，
// 不重扫目录；之后新落盘登记的文件仍可命中。
func TestServeCachedThumbnailSelfHealsVanishedIndexedFile(t *testing.T) {
	dir := t.TempDir()
	store := &ThumbnailStore{dir: dir}
	touchThumbnail(t, dir, "src-h.1-1.jpg")

	scans := countDirScans(t, dir)
	if _, err := serveCached(t, store, "src-h"); err != nil {
		t.Fatalf("serve cached thumbnail: %v", err)
	}
	if got := scans(); got != 1 {
		t.Fatalf("index build must scan exactly once, got %d scans", got)
	}

	// 外部手动清理缓存目录：索引指向的文件消失。
	if err := os.Remove(filepath.Join(dir, "src-h.1-1.jpg")); err != nil {
		t.Fatal(err)
	}
	if _, err := serveCached(t, store, "src-h"); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("vanished indexed file must self-heal to os.ErrNotExist, got %v", err)
	}
	if _, err := serveCached(t, store, "src-h"); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("after the heal the entry is gone, subsequent lookup must be os.ErrNotExist, got %v", err)
	}
	if got := scans(); got != 1 {
		t.Fatalf("self-heal and post-heal misses must not rescan the directory, got %d scans", got)
	}

	// 新缓存落盘并登记后照常命中：自愈绝不影响后续登记。
	fresh := filepath.Join(dir, "src-h.2-2.jpg")
	touchThumbnail(t, dir, "src-h.2-2.jpg")
	freshTime := time.Now().Add(time.Hour)
	if err := os.Chtimes(fresh, freshTime, freshTime); err != nil {
		t.Fatal(err)
	}
	store.recordThumbFile(fresh)
	rec, err := serveCached(t, store, "src-h")
	if err != nil {
		t.Fatalf("serve re-recorded thumbnail: %v", err)
	}
	if etag := rec.Header().Get("ETag"); etag != `"src-h.2-2.jpg"` {
		t.Fatalf("expected the newly recorded entry to be served, got ETag %s", etag)
	}
}

// forgetCachedThumbCAS 只在条目仍指向目标文件名时删除：并发登记的更新文件
// 不能被旧文件的清理误删。
func TestForgetCachedThumbCASKeepsNewerEntry(t *testing.T) {
	dir := t.TempDir()
	store := &ThumbnailStore{dir: dir}
	touchThumbnail(t, dir, "s.1.jpg")
	if _, err := serveCached(t, store, "s"); err != nil {
		t.Fatalf("serve cached thumbnail: %v", err)
	}

	newer := time.Now().Add(time.Hour)
	store.recordCachedThumb("s", "s.2.jpg", newer)
	if entry, ok := store.latestCached("s"); !ok || entry.filename != "s.2.jpg" {
		t.Fatalf("expected the index to point at s.2.jpg, got %v (ok=%v)", entry, ok)
	}

	store.forgetCachedThumbCAS("s", "s.1.jpg")
	if entry, ok := store.latestCached("s"); !ok || entry.filename != "s.2.jpg" {
		t.Fatalf("CAS must keep the newer entry when the stale filename does not match, got %v (ok=%v)", entry, ok)
	}
	store.forgetCachedThumbCAS("s", "s.2.jpg")
	if _, ok := store.latestCached("s"); ok {
		t.Fatal("CAS must remove the entry when the filename matches")
	}
}

// pruneStale 删除索引登记的当前文件时，必须按 CAS 恰好移除该条目；
// 未受影响的 Source 的条目原样保留。
func TestPruneStaleRemovesIndexedEntryForDeletedFile(t *testing.T) {
	dir := t.TempDir()
	store := &ThumbnailStore{dir: dir}
	touchThumbnail(t, dir, "src-p.1-1.jpg")
	touchThumbnail(t, dir, "src-q.1-1.jpg")
	if _, err := serveCached(t, store, "src-p"); err != nil {
		t.Fatalf("serve cached thumbnail: %v", err)
	}
	if _, err := serveCached(t, store, "src-q"); err != nil {
		t.Fatalf("serve cached thumbnail: %v", err)
	}

	store.pruneStale(context.Background(), []thumbnailPruneEntry{
		{SourceID: "src-p", Version: "9-9"}, // 版本失效：旧文件进入清理名单
		{SourceID: "src-q", Version: "1-1"}, // 版本匹配：保留
	})

	if _, err := os.Stat(filepath.Join(dir, "src-p.1-1.jpg")); !os.IsNotExist(err) {
		t.Fatalf("expected the stale file to be pruned, got %v", err)
	}
	if entry, ok := store.latestCached("src-p"); ok {
		t.Fatalf("pruned file's index entry must be removed, got %v", entry)
	}
	if entry, ok := store.latestCached("src-q"); !ok || entry.filename != "src-q.1-1.jpg" {
		t.Fatalf("untouched source's entry must survive, got %v (ok=%v)", entry, ok)
	}
	if _, err := serveCached(t, store, "src-p"); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("post-prune lookup must be os.ErrNotExist without rescanning, got %v", err)
	}
}

// Prune 的取消透传：名单读取后、清理轮开始前取消，每一轮都必须立即退出，
// 一个文件也不删除。
func TestPruneHonorsCancellationAfterListing(t *testing.T) {
	store, dir := pruneFixture(t)
	touchThumbnail(t, dir, "gone.old.jpg")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	store.Prune(ctx, func(context.Context) ([]storage.SourceModel, error) {
		cancel() // 取消发生在 prune 内部：清理轮看到的一定是已取消的 ctx
		return []storage.SourceModel{{ID: "known", Location: filepath.Join(t.TempDir(), "missing.png")}}, nil
	})

	if _, err := os.Stat(filepath.Join(dir, "gone.old.jpg")); err != nil {
		t.Fatalf("a cancelled prune must not delete anything: %v", err)
	}
}

// 启动期 Prune 由 StartPrune 纳入 wg 与关停上下文：Close 必须等它结束（不能提前
// 返回），排空时 ctx 已被取消，清理轮不再删除任何文件。
func TestCloseCancelsAndDrainsStartupPrune(t *testing.T) {
	store, dir := pruneFixture(t)
	touchThumbnail(t, dir, "gone.old.jpg")
	entered := make(chan struct{})
	release := make(chan struct{})
	var releaseOnce sync.Once
	t.Cleanup(func() { store.Close() })                             // 后注册，最后执行
	t.Cleanup(func() { releaseOnce.Do(func() { close(release) }) }) // 先执行：失败路径也能放行

	store.StartPrune(func(context.Context) ([]storage.SourceModel, error) {
		close(entered)
		<-release
		return []storage.SourceModel{{ID: "known", Location: filepath.Join(t.TempDir(), "missing.png")}}, nil
	})
	<-entered // lister 已被调用：wg.Add 已在锁内完成，Close 必须等它

	closed := make(chan struct{})
	go func() {
		store.Close()
		close(closed)
	}()
	select {
	case <-closed:
		t.Fatal("Close returned while the startup prune was still listing")
	default:
	}

	releaseOnce.Do(func() { close(release) })
	waitForClose(t, closed, "startup prune drain")

	// Close 已取消关停上下文：放行后的清理轮立即退出，陈旧文件保留。
	if _, err := os.Stat(filepath.Join(dir, "gone.old.jpg")); err != nil {
		t.Fatalf("the cancelled startup prune must not delete anything: %v", err)
	}
}

// ---- 并发构建：去重、首请求取消、Close 排空 ----

// gateBuilds 把 buildThumbnailFn 换成可控构建：进入即计数并向 started 发一次信号
// （缓冲 1，后来的丢弃），随后阻塞直到 releaseBuilds 被调用，放行后委托真实构建。
// 返回读计数的函数与放行函数（幂等）。收尾（LIFO 早于 handler.Close 的 cleanup）
// 先放行再还原函数，用例中途失败也不会把构建协程永久留在 gate 上卡死 Close 的 wg.Wait。
func gateBuilds(t *testing.T, started chan struct{}) (buildCount func() int, releaseBuilds func()) {
	t.Helper()
	original := buildThumbnailFn
	gate := make(chan struct{})
	var mu sync.Mutex
	count := 0
	var gateOnce sync.Once
	buildThumbnailFn = func(path string) ([]byte, error) {
		mu.Lock()
		count++
		mu.Unlock()
		select {
		case started <- struct{}{}:
		default:
		}
		<-gate
		return original(path)
	}
	t.Cleanup(func() {
		gateOnce.Do(func() { close(gate) })
		buildThumbnailFn = original
	})
	return func() int {
			mu.Lock()
			defer mu.Unlock()
			return count
		}, func() {
			gateOnce.Do(func() { close(gate) })
		}
}

// requestThumbnailAsync 在独立 goroutine 里发起一次缩略图 GET，结束时把 recorder 送回。
func requestThumbnailAsync(handler *Handler, request *http.Request) <-chan *httptest.ResponseRecorder {
	done := make(chan *httptest.ResponseRecorder, 1)
	go func() {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, request)
		done <- rec
	}()
	return done
}

func waitForSignal(t *testing.T, ch <-chan struct{}, stage string) {
	t.Helper()
	select {
	case <-ch:
	case <-time.After(5 * time.Second):
		t.Fatalf("%s: signal never arrived", stage)
	}
}

func waitForClose(t *testing.T, closed <-chan struct{}, stage string) {
	t.Helper()
	select {
	case <-closed:
	case <-time.After(5 * time.Second):
		t.Fatalf("%s: Close did not drain within 5s", stage)
	}
}

// requireServedThumbnail 断言响应是 200 且可解码的 JPEG。
func requireServedThumbnail(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if _, format, err := image.Decode(bytes.NewReader(rec.Body.Bytes())); err != nil || format != "jpeg" {
		t.Fatalf("expected a decodable jpeg response, got %v (%s)", err, format)
	}
}

func writeJPEGFixture(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, mustJPEG(t, gradientImage(600, 400)), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}
	return path
}

// 同一版本的并发请求必须合并为一次构建：无去重时多图同屏会把解码内存放大 N 倍。
func TestServeThumbnailDedupsConcurrentBuildsToSingleBuild(t *testing.T) {
	db := openTestDB(t)
	insertFileSource(t, db, "source-dedup", writeJPEGFixture(t, "photo.jpg"))
	handler := newThumbnailHandler(t, db)

	started := make(chan struct{}, 1)
	buildCount, releaseBuilds := gateBuilds(t, started)

	const requests = 4
	responses := make([]<-chan *httptest.ResponseRecorder, requests)
	for i := range responses {
		responses[i] = requestThumbnailAsync(handler,
			httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-dedup", nil))
	}
	waitForSignal(t, started, "first build start")
	// 挂载窗口：其余请求要么挂上同一 call，要么晚到命中缓存——两条路径都必须
	// 拿到有效缩略图。窗口只加强覆盖（否则可能全走缓存路径而测不到去重），
	// 断言本身在任何交错下都成立。
	time.Sleep(50 * time.Millisecond)
	releaseBuilds()

	for _, done := range responses {
		requireServedThumbnail(t, <-done)
	}
	if got := buildCount(); got != 1 {
		t.Fatalf("expected %d concurrent same-key requests to dedup to one build, got %d", requests, got)
	}
}

// 首请求中途取消不能毒化后续同 key 请求：取消必须把调用从 inflight 摘除并触发重建，
// 而不是让后来者挂到一个已取消、永远不会写盘的调用上拿到空响应。
func TestCancelledFirstRequestDoesNotPoisonSameKeyRequests(t *testing.T) {
	db := openTestDB(t)
	insertFileSource(t, db, "source-poison", writeJPEGFixture(t, "photo.jpg"))
	handler := newThumbnailHandler(t, db)

	started := make(chan struct{}, 1)
	buildCount, releaseBuilds := gateBuilds(t, started)

	first := httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-poison", nil)
	firstCtx, cancelFirst := context.WithCancel(context.Background())
	defer cancelFirst()
	first = first.WithContext(firstCtx)
	firstDone := requestThumbnailAsync(handler, first)

	waitForSignal(t, started, "first build start")
	cancelFirst()
	firstRec := <-firstDone
	if firstRec.Body.Len() != 0 {
		t.Fatalf("cancelled request must stay silent, got %d bytes: %q", firstRec.Body.Len(), firstRec.Body.String())
	}

	// 首请求已确认返回（inflight 已摘除），两个活跃同 key 请求必须触发重建并成功。
	secondDone := requestThumbnailAsync(handler,
		httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-poison", nil))
	thirdDone := requestThumbnailAsync(handler,
		httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-poison", nil))
	waitForSignal(t, started, "rebuild start")
	time.Sleep(30 * time.Millisecond)
	releaseBuilds()

	requireServedThumbnail(t, <-secondDone)
	requireServedThumbnail(t, <-thirdDone)
	if got := buildCount(); got != 2 {
		t.Fatalf("expected the cancelled build plus exactly one rebuild, got %d builds", got)
	}
}

// Close 必须等在途构建结束：构建阻塞时 Close 不能已返回（wg 计量缺失会立刻漏过），
// 放行后要能排空且不死锁；关停期到达的请求按服务端错误回 500，不再发起新构建。
func TestCloseDrainsInFlightBuildAndRejectsLaterRequests(t *testing.T) {
	db := openTestDB(t)
	insertFileSource(t, db, "source-drain", writeJPEGFixture(t, "photo.jpg"))
	handler := newThumbnailHandler(t, db)

	started := make(chan struct{}, 1)
	buildCount, releaseBuilds := gateBuilds(t, started)

	requestDone := requestThumbnailAsync(handler,
		httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-drain", nil))
	waitForSignal(t, started, "build start")

	closed := make(chan struct{})
	go func() {
		handler.thumbs.Close()
		close(closed)
	}()
	select {
	case <-closed:
		t.Fatal("Close returned while the build was still blocked mid-flight")
	default:
	}

	releaseBuilds()
	waitForClose(t, closed, "in-flight build drain")

	rec := <-requestDone
	if rec.Code != http.StatusInternalServerError || rec.Body.Len() == 0 {
		t.Fatalf("live client during close must get a non-empty 500, got %d %q", rec.Code, rec.Body.String())
	}

	after := httptest.NewRecorder()
	handler.ServeHTTP(after, httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+"source-drain", nil))
	if after.Code != http.StatusInternalServerError || after.Body.Len() == 0 {
		t.Fatalf("post-close request must fail sanely, got %d %q", after.Code, after.Body.String())
	}
	if got := buildCount(); got != 1 {
		t.Fatalf("post-close request must not trigger another build, got %d builds", got)
	}
}

// Close 同样要等启动期 Prune：lister 阻塞期间 Close 不能返回，放行后清理照常完成。
func TestCloseWaitsForRunningPrune(t *testing.T) {
	store, dir := pruneFixture(t)
	touchThumbnail(t, dir, "gone.old.jpg")
	entered := make(chan struct{})
	release := make(chan struct{})
	var releaseOnce sync.Once
	t.Cleanup(func() { releaseOnce.Do(func() { close(release) }) })
	t.Cleanup(func() { store.Close() })

	done := make(chan struct{})
	go func() {
		store.Prune(context.Background(), func(context.Context) ([]storage.SourceModel, error) {
			close(entered)
			<-release
			return []storage.SourceModel{{ID: "known", Location: filepath.Join(t.TempDir(), "missing.png")}}, nil
		})
		close(done)
	}()
	<-entered // lister 已被调用：wg.Add 已在锁内完成，Close 必须等它

	closed := make(chan struct{})
	go func() {
		store.Close()
		close(closed)
	}()
	select {
	case <-closed:
		t.Fatal("Close returned while prune was still listing")
	default:
	}

	releaseOnce.Do(func() { close(release) })
	waitForClose(t, closed, "running prune drain")
	<-done

	if _, err := os.Stat(filepath.Join(dir, "gone.old.jpg")); !os.IsNotExist(err) {
		t.Fatalf("expected stale thumbnail to be pruned before Close returned, got %v", err)
	}
}

// 占满 buildSem 后，一个仍在等令牌的构建被全部等待者放弃：它的提前返回绝不能
// 触碰信号量。偷走一个令牌会让缺口永久存在——最后一个释放者卡死在空信号量上，
// wg.Done 永远不执行，Close 的 wg.Wait 死锁。本用例钉住这个精确的死锁场景。
func TestCancelledSlotStarvedBuildDoesNotDeadlockClose(t *testing.T) {
	db := openTestDB(t)
	handler := newThumbnailHandler(t, db)
	handler.thumbs.ensureInit()
	slots := cap(handler.thumbs.buildSem)

	// slots 个 Source 占满构建槽，最后一个 Source 的构建在等令牌。
	const waiterID = "source-waiter"
	var waiterFile string
	for i := 0; i < slots+1; i++ {
		file := writeJPEGFixture(t, fmt.Sprintf("photo-%d.jpg", i))
		if i == slots {
			waiterFile = file
		}
		insertFileSource(t, db, fmt.Sprintf("source-slot-%d", i), file)
	}
	insertFileSource(t, db, waiterID, waiterFile)

	// 失败路径的解锁垫片（LIFO 先于 gateBuilds 的放行、后于其执行）：若令牌被偷走，
	// 某个构建的释放会卡在空信号量上；补足令牌让 cleanup 里的 Close 不把测试进程挂死。
	t.Cleanup(func() {
		for i := 0; i < slots; i++ {
			select {
			case handler.thumbs.buildSem <- struct{}{}:
			default:
			}
		}
	})

	started := make(chan struct{}, 1)
	buildCount, releaseBuilds := gateBuilds(t, started)

	// 逐个点燃并等待启动信号：每个信号证明对应构建已持有一个令牌并阻塞在构建内。
	for i := 0; i < slots; i++ {
		done := requestThumbnailAsync(handler,
			httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+fmt.Sprintf("source-slot-%d", i), nil))
		waitForSignal(t, started, fmt.Sprintf("slot build %d start", i))
		defer func(rec <-chan *httptest.ResponseRecorder) { <-rec }(done)
	}

	// 等令牌的构建：先确认它已注册（wg.Add 与构建协程都已发生），再让唯一等待者离开。
	waiterInfo, err := os.Stat(waiterFile)
	if err != nil {
		t.Fatal(err)
	}
	waiterKey := waiterID + "." + thumbnailVersion(waiterInfo)
	waiterCtx, cancelWaiter := context.WithCancel(context.Background())
	defer cancelWaiter()
	waiterRequest := httptest.NewRequest(http.MethodGet, ThumbnailPathPrefix+waiterID, nil).WithContext(waiterCtx)
	waiterDone := requestThumbnailAsync(handler, waiterRequest)

	registered := false
	for deadline := time.Now().Add(2 * time.Second); !registered; {
		handler.thumbs.mu.Lock()
		registered = handler.thumbs.inflight[waiterKey] != nil
		handler.thumbs.mu.Unlock()
		if registered {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("slot-starved build never registered")
		}
		time.Sleep(5 * time.Millisecond)
	}
	cancelWaiter()
	waiterRec := <-waiterDone
	if waiterRec.Body.Len() != 0 {
		t.Fatalf("cancelled waiter request must stay silent, got %q", waiterRec.Body.String())
	}

	// 放行阻塞的构建并关停：被放弃的等待构建若偷过令牌，这里必然死锁。
	closed := make(chan struct{})
	go func() {
		handler.thumbs.Close()
		close(closed)
	}()
	releaseBuilds()
	waitForClose(t, closed, "drain after slot-starved build cancellation")

	if got := buildCount(); got != slots {
		t.Fatalf("expected exactly %d builds to enter the build path, got %d", slots, got)
	}
}
