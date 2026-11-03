package media

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

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

func TestThumbnailRouteRejectsUnavailableSource(t *testing.T) {
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
	store.PruneStale([]ThumbnailPruneEntry{
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
