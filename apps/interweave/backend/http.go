package backend

// ---- /media/{id} 本地流服务 ----

import (
	"database/sql"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
)

const maxTextPreview = 512 * 1024 // 文本预览截断上限

// mediaHandler 服务于条目源文件（仅 file 条目）。支持 Range 请求以支持音视频拖动。
func mediaHandler(db *sql.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/media/")
		id = strings.Trim(id, "/")
		if id == "" {
			http.NotFound(w, r)
			return
		}
		item, err := getItem(r.Context(), db, id)
		if err != nil || item == nil || item.Kind != "file" {
			http.NotFound(w, r)
			return
		}
		info, err := os.Stat(item.Locator)
		if err != nil || info.IsDir() {
			http.NotFound(w, r)
			return
		}
		m := item.Mime
		if m == "" {
			m = detectMime(item.Locator)
		}
		if strings.HasPrefix(m, "text/") || m == "application/json" || m == "application/xml" {
			serveTextPreview(w, r, item.Locator, m)
			return
		}
		serveFileRange(w, r, item.Locator, m, info.Size())
	})
}

func serveTextPreview(w http.ResponseWriter, r *http.Request, path, mimeType string) {
	f, err := os.Open(path)
	if err != nil {
		http.Error(w, "unable to open file", http.StatusNotFound)
		return
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, maxTextPreview))
	if err != nil {
		http.Error(w, "read failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", mimeType+"; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(data)
}

// serveFileRange 实现单段 Range 支持（音视频拖动必需）。
func serveFileRange(w http.ResponseWriter, r *http.Request, path, mimeType string, size int64) {
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Type", mimeType)
	start, end := int64(0), size-1
	if rangeHdr := r.Header.Get("Range"); rangeHdr != "" {
		rest, ok := strings.CutPrefix(rangeHdr, "bytes=")
		if !ok {
			http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
			return
		}
		parts := strings.SplitN(rest, "-", 2)
		if len(parts) != 2 {
			http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
			return
		}
		if parts[0] == "" {
			n, err := strconv.ParseInt(parts[1], 10, 64)
			if err != nil || n <= 0 {
				http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
				return
			}
			if n > size {
				n = size
			}
			start, end = size-n, size-1
		} else {
			s, err := strconv.ParseInt(parts[0], 10, 64)
			if err != nil {
				http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
				return
			}
			start = s
			if parts[1] != "" {
				e, err := strconv.ParseInt(parts[1], 10, 64)
				if err != nil {
					http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
					return
				}
				end = e
			}
		}
		if start < 0 || end < start || start >= size {
			w.Header().Set("Content-Range", fmtRange(size))
			http.Error(w, "range not satisfiable", http.StatusRequestedRangeNotSatisfiable)
			return
		}
		if end >= size {
			end = size - 1
		}
		f, err := os.Open(path)
		if err != nil {
			http.Error(w, "unable to open file", http.StatusNotFound)
			return
		}
		defer f.Close()
		if _, err := f.Seek(start, io.SeekStart); err != nil {
			http.Error(w, "seek failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Range", fmtRange2(start, end, size))
		w.Header().Set("Content-Length", strconv.FormatInt(end-start+1, 10))
		w.WriteHeader(http.StatusPartialContent)
		_, _ = io.CopyN(w, f, end-start+1)
		return
	}
	f, err := os.Open(path)
	if err != nil {
		http.Error(w, "unable to open file", http.StatusNotFound)
		return
	}
	defer f.Close()
	w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	_, _ = io.Copy(w, f)
}

func fmtRange(size int64) string { return "bytes */" + strconv.FormatInt(size, 10) }
func fmtRange2(start, end, size int64) string {
	return "bytes " + strconv.FormatInt(start, 10) + "-" + strconv.FormatInt(end, 10) + "/" + strconv.FormatInt(size, 10)
}

