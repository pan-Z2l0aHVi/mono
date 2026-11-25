package core

import (
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// resourceKindByExtension 只描述文件入口的展示分类，不读取文件内容。
// 未列出的扩展名稳定归入 file，避免前端各自维护一份降级词表。
var resourceKindByExtension = map[string]storage.ResourceKind{
	// 图片
	".avif": storage.ResourceKindImage,
	".bmp":  storage.ResourceKindImage,
	".gif":  storage.ResourceKindImage,
	".heic": storage.ResourceKindImage,
	".heif": storage.ResourceKindImage,
	".ico":  storage.ResourceKindImage,
	".jpeg": storage.ResourceKindImage,
	".jpg":  storage.ResourceKindImage,
	".png":  storage.ResourceKindImage,
	".svg":  storage.ResourceKindImage,
	".tif":  storage.ResourceKindImage,
	".tiff": storage.ResourceKindImage,
	".webp": storage.ResourceKindImage,

	// 视频
	".3gp":  storage.ResourceKindVideo,
	".avi":  storage.ResourceKindVideo,
	".flv":  storage.ResourceKindVideo,
	".m4v":  storage.ResourceKindVideo,
	".mkv":  storage.ResourceKindVideo,
	".mov":  storage.ResourceKindVideo,
	".mp4":  storage.ResourceKindVideo,
	".mpeg": storage.ResourceKindVideo,
	".mpg":  storage.ResourceKindVideo,
	".webm": storage.ResourceKindVideo,
	".wmv":  storage.ResourceKindVideo,

	// 音频
	".aac":  storage.ResourceKindAudio,
	".aif":  storage.ResourceKindAudio,
	".aiff": storage.ResourceKindAudio,
	".alac": storage.ResourceKindAudio,
	".flac": storage.ResourceKindAudio,
	".m4a":  storage.ResourceKindAudio,
	".mp3":  storage.ResourceKindAudio,
	".oga":  storage.ResourceKindAudio,
	".ogg":  storage.ResourceKindAudio,
	".opus": storage.ResourceKindAudio,
	".wav":  storage.ResourceKindAudio,
	".wma":  storage.ResourceKindAudio,

	// 文档与文本
	".csv":      storage.ResourceKindDocument,
	".doc":      storage.ResourceKindDocument,
	".docx":     storage.ResourceKindDocument,
	".epub":     storage.ResourceKindDocument,
	".html":     storage.ResourceKindDocument,
	".htm":      storage.ResourceKindDocument,
	".md":       storage.ResourceKindDocument,
	".markdown": storage.ResourceKindDocument,
	".odt":      storage.ResourceKindDocument,
	".pages":    storage.ResourceKindDocument,
	".pdf":      storage.ResourceKindDocument,
	".ppt":      storage.ResourceKindDocument,
	".pptx":     storage.ResourceKindDocument,
	".rtf":      storage.ResourceKindDocument,
	".tex":      storage.ResourceKindDocument,
	".tsv":      storage.ResourceKindDocument,
	".txt":      storage.ResourceKindDocument,
	".xls":      storage.ResourceKindDocument,
	".xlsx":     storage.ResourceKindDocument,
	".xml":      storage.ResourceKindDocument,
	".yaml":     storage.ResourceKindDocument,
	".yml":      storage.ResourceKindDocument,

	// 结构化数据
	".geojson": storage.ResourceKindJSON,
	".json":    storage.ResourceKindJSON,
	".jsonl":   storage.ResourceKindJSON,
	".ndjson":  storage.ResourceKindJSON,
}

// resourceViewMetadata 从首选 Source 派生仅用于展示的字段。
// 领域规则保证 Resource 始终有首选 Source；首个 Source 只作为异常旧数据的防御性回退。
func resourceViewMetadata(sources []Source) (storage.ResourceKind, *int64) {
	var preferred *Source
	for i := range sources {
		if sources[i].IsPreferred {
			preferred = &sources[i]
			break
		}
	}
	if preferred == nil && len(sources) > 0 {
		preferred = &sources[0]
	}
	if preferred == nil {
		return storage.ResourceKindFile, nil
	}
	if preferred.Type == storage.SourceTypeURL {
		// URL 来源按展示分类：直链图片（扩展名优先，探测到的 Content-Type 兑底）归 image，
		// 驱动缩略图、预览形态与壁纸菜单；其余保持 web。见 interweave AGENTS.md「资源（Resource）」。
		if kind := resourceKindForURL(preferred); kind != storage.ResourceKindWeb {
			return kind, nil
		}
		return storage.ResourceKindWeb, nil
	}

	kind := resourceKindForFile(preferred.Location)
	if preferred.Type != storage.SourceTypeFile || !preferred.Available {
		return kind, nil
	}

	verdict, size := ProbeFileServability(preferred.Location)
	if verdict != FileServable {
		return kind, nil
	}
	// 展示型 size 只信任可读文件：额外的 Open 探针保留。
	file, err := os.Open(preferred.Location)
	if err != nil {
		return kind, nil
	}
	_ = file.Close()
	return kind, size
}

func resourceKindForFile(location string) storage.ResourceKind {
	ext := strings.ToLower(filepath.Ext(location))
	if kind, ok := resourceKindByExtension[ext]; ok {
		return kind
	}
	return storage.ResourceKindFile
}

// resourceKindForURL 只把「直链图片」归为 image：扩展名优先（词表里 image 档才直接定 kind），
// Content-Type 兑底（探测成功才有，image/* 即 image）。其余一律 web——.html/.json 这类
// 已知扩展名是页面/数据的概率远高于直链资源，页面链接的展示身份不变。
func resourceKindForURL(source *Source) storage.ResourceKind {
	location := source.Location
	if parsed, err := url.Parse(location); err == nil {
		ext := strings.ToLower(filepath.Ext(parsed.Path))
		if resourceKindByExtension[ext] == storage.ResourceKindImage {
			return storage.ResourceKindImage
		}
	}
	var metadata remote.URLMetadata
	if source.MetadataJSON != "" && json.Unmarshal([]byte(source.MetadataJSON), &metadata) == nil {
		if strings.HasPrefix(metadata.ContentType, "image/") {
			return storage.ResourceKindImage
		}
	}
	return storage.ResourceKindWeb
}
