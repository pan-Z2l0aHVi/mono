package media

import (
	"net/url"
	"strings"
)

// URLBuilder 统一构造媒体与缩略图读取地址。
// 零值产出相对 AssetServer 路径；配置 baseURL（如 Windows LocalServer 基址）时产出绝对回环 URL。
type URLBuilder struct {
	baseURL string
}

// NewURLBuilder 按给定基址构造 URLBuilder；自动去除尾斜杠，空串等价于相对路径模式。
func NewURLBuilder(baseURL string) URLBuilder {
	return URLBuilder{baseURL: strings.TrimRight(baseURL, "/")}
}

// SourceMediaURL 返回 file Source 原始字节的读取地址。
func (b URLBuilder) SourceMediaURL(sourceID string) string {
	return b.baseURL + SourceMediaURL(sourceID)
}

// SourceThumbnailURL 返回 Source 派生缩略图的读取/回填地址。
func (b URLBuilder) SourceThumbnailURL(sourceID string) string {
	return b.baseURL + SourceThumbnailURL(sourceID)
}

// PendingMediaURL 返回尚未持久化媒体授权（pending preview token）的读取地址。
func (b URLBuilder) PendingMediaURL(token string) string {
	return b.baseURL + PendingMediaURL(token)
}

// SourceMediaURL 是 file Source 原始字节的 AssetServer 地址；身份经路径转义，
// 调用方不再自行拼接路由前缀。
func SourceMediaURL(sourceID string) string {
	return PathPrefix + url.PathEscape(sourceID)
}

// SourceThumbnailURL 是 Source 派生缩略图的 AssetServer 地址，GET/HEAD 读取、POST 回填同址。
func SourceThumbnailURL(sourceID string) string {
	return ThumbnailPathPrefix + url.PathEscape(sourceID)
}

// PendingMediaURL 是尚未持久化媒体授权（pending preview token）的读取地址。
func PendingMediaURL(token string) string {
	return PendingPathPrefix + url.PathEscape(token)
}
