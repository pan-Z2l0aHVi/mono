package backend

// ---- 元数据提取（纯 Go，无第三方依赖） ----

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var extMime = map[string]string{
	// 文本
	".txt": "text/plain", ".md": "text/markdown", ".markdown": "text/markdown",
	".json": "application/json", ".yaml": "text/yaml", ".yml": "text/yaml",
	".xml": "text/xml", ".csv": "text/csv", ".log": "text/plain",
	".ts": "text/typescript", ".tsx": "text/typescript", ".js": "text/javascript",
	".jsx": "text/javascript", ".vue": "text/x-vue", ".go": "text/x-go",
	".py": "text/x-python", ".rs": "text/x-rust", ".sh": "text/x-sh",
	".css": "text/css", ".html": "text/html", ".htm": "text/html",
	// 图像
	".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
	".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
	".svg": "image/svg+xml", ".ico": "image/x-icon", ".avif": "image/avif",
	// 音频
	".mp3": "audio/mpeg", ".wav": "audio/wav", ".flac": "audio/flac",
	".aac": "audio/aac", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
	".opus": "audio/opus", ".wma": "audio/x-ms-wma",
	// 视频
	".mp4": "video/mp4", ".mkv": "video/x-matroska", ".mov": "video/quicktime",
	".avi": "video/x-msvideo", ".webm": "video/webm", ".wmv": "video/x-ms-wmv",
	".m4v": "video/mp4",
	// 其他
	".pdf": "application/pdf", ".zip": "application/zip", ".doc": "application/msword",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xls":  "application/vnd.ms-excel",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".ppt":  "application/vnd.ms-powerpoint",
	".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

// detectMime 优先按扩展名判断，其次读取文件头。
func detectMime(path string) string {
	if m := extMime[strings.ToLower(filepath.Ext(path))]; m != "" {
		return m
	}
	f, err := os.Open(path)
	if err != nil {
		return "application/octet-stream"
	}
	defer f.Close()
	buf := make([]byte, 512)
	n, _ := io.ReadFull(f, buf)
	return http.DetectContentType(buf[:n])
}

// imageSize 解析常见图像格式的宽高；无法解析时返回 0,0。
func imageSize(path string) (w, h int) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0
	}
	defer f.Close()
	head := make([]byte, 64)
	n, _ := io.ReadFull(f, head)
	b := head[:n]
	switch {
	case len(b) >= 24 && bytes.Equal(b[:8], []byte{0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a}):
		return int(binary.BigEndian.Uint32(b[16:20])), int(binary.BigEndian.Uint32(b[20:24]))
	case len(b) >= 4 && bytes.Equal(b[:4], []byte("GIF8")):
		return int(binary.LittleEndian.Uint16(b[6:8])), int(binary.LittleEndian.Uint16(b[8:10]))
	case len(b) >= 12 && bytes.Equal(b[:4], []byte("RIFF")) && bytes.Equal(b[8:12], []byte("WEBP")):
		if len(b) >= 30 && bytes.Equal(b[12:16], []byte("VP8X")) {
			return int(binary.LittleEndian.Uint32(b[24:28])&0xFFFFFF + 1), int(binary.LittleEndian.Uint32(b[28:32])&0xFFFFFF + 1)
		}
	case len(b) >= 2 && b[0] == 0xFF && b[1] == 0xD8:
		return jpegSize(f)
	}
	return 0, 0
}

// jpegSize 扫描 JPEG SOF 段获取宽高。
func jpegSize(f *os.File) (w, h int) {
	r := bufio.NewReader(f)
	if _, err := r.ReadByte(); err != nil {
		return 0, 0
	}
	if _, err := r.ReadByte(); err != nil {
		return 0, 0
	}
	for {
		var marker [2]byte
		if _, err := io.ReadFull(r, marker[:]); err != nil {
			return 0, 0
		}
		if marker[0] != 0xFF {
			return 0, 0
		}
		for marker[1] == 0xFF {
			if _, err := r.ReadByte(); err != nil {
				return 0, 0
			}
		}
		if marker[1] >= 0xC0 && marker[1] <= 0xCF && marker[1] != 0xC4 && marker[1] != 0xC8 && marker[1] != 0xCC {
			var segLen [2]byte
			if _, err := io.ReadFull(r, segLen[:]); err != nil {
				return 0, 0
			}
			payload := make([]byte, int(segLen[0])<<8|int(segLen[1])-2)
			if _, err := io.ReadFull(r, payload); err != nil {
				return 0, 0
			}
			if len(payload) >= 5 {
				return int(binary.BigEndian.Uint16(payload[3:5])), int(binary.BigEndian.Uint16(payload[1:3]))
			}
			return 0, 0
		}
		var segLen [2]byte
		if _, err := io.ReadFull(r, segLen[:]); err != nil {
			return 0, 0
		}
		skip := int(segLen[0])<<8 | int(segLen[1]) - 2
		if _, err := io.CopyN(io.Discard, r, int64(skip)); err != nil {
			return 0, 0
		}
	}
}

// mp4Duration 解析 MP4/M4A 的 mvhd 时长（毫秒）；失败返回 0。
func mp4Duration(path string) int64 {
	f, err := os.Open(path)
	if err != nil {
		return 0
	}
	defer f.Close()
	r := bufio.NewReader(f)
	for {
		var hdr [8]byte
		if _, err := io.ReadFull(r, hdr[:]); err != nil {
			return 0
		}
		size := binary.BigEndian.Uint32(hdr[:4])
		typ := string(hdr[4:8])
		if size == 1 {
			var ext [8]byte
			if _, err := io.ReadFull(r, ext[:]); err != nil {
				return 0
			}
			size = binary.BigEndian.Uint32(ext[:4])
		}
		if typ == "mvhd" {
			payload := make([]byte, int(size)-8)
			if _, err := io.ReadFull(r, payload); err != nil {
				return 0
			}
			if len(payload) >= 32 && payload[0] == 0 {
				timescale := binary.BigEndian.Uint32(payload[20:24])
				duration := binary.BigEndian.Uint64(payload[24:32])
				if timescale == 0 {
					return 0
				}
				return int64(duration * 1000 / uint64(timescale))
			}
			timescale := binary.BigEndian.Uint32(payload[12:16])
			duration := binary.BigEndian.Uint32(payload[16:20])
			if timescale == 0 {
				return 0
			}
			return int64(duration) * 1000 / int64(timescale)
		}
		if _, err := io.CopyN(io.Discard, r, int64(size)-8); err != nil {
			return 0
		}
	}
}

// previewType 判断条目是否适合内联预览。
func previewType(m string) string {
	switch {
	case strings.HasPrefix(m, "image/"):
		return "image"
	case strings.HasPrefix(m, "video/"):
		return "video"
	case strings.HasPrefix(m, "audio/"):
		return "audio"
	case strings.HasPrefix(m, "text/"), m == "application/json", m == "application/xml":
		return "text"
	default:
		return "none"
	}
}
