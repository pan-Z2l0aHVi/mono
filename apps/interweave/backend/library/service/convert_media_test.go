package service

import (
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 媒体地址由 service 生成，必须与 media 处理器实际路由逐字一致：
// 前端只消费 DTO 字段，不再有机会拼出另一套前缀。
func TestSourceDTOMediaURLsMatchHandlerRoutes(t *testing.T) {
	dto := sourceToDTO(core.Source{ID: "source-uuid", Type: storage.SourceTypeFile})

	if dto.MediaURL != media.SourceMediaURL("source-uuid") {
		t.Errorf("expected media url %q, got %q", media.SourceMediaURL("source-uuid"), dto.MediaURL)
	}
	if dto.ThumbnailURL != media.SourceThumbnailURL("source-uuid") {
		t.Errorf("expected thumbnail url %q, got %q", media.SourceThumbnailURL("source-uuid"), dto.ThumbnailURL)
	}
}

// url Source 没有本地字节可读，不应暴露会被 404 的媒体地址。
func TestSourceDTOOmitsMediaURLsForURLSources(t *testing.T) {
	dto := sourceToDTO(core.Source{ID: "source-uuid", Type: storage.SourceTypeURL})
	if dto.MediaURL != "" || dto.ThumbnailURL != "" {
		t.Errorf("expected no local media urls, got %q / %q", dto.MediaURL, dto.ThumbnailURL)
	}
}
