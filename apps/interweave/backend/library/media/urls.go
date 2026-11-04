package media

import "net/url"

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
