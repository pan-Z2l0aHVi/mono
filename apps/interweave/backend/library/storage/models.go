package storage

// 区分本地与网络入口，避免用内容类型替代来源语义。
type SourceType string

const (
	SourceTypeFile SourceType = "file"
	SourceTypeURL  SourceType = "url"
)

// 持久化 Resource 自身的库内上下文。
type ResourceModel struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Note      string `json:"note"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
}

// 持久化 Resource 的外部入口及其可用状态。
type SourceModel struct {
	ID           string     `json:"id"`
	ResourceID   string     `json:"resource_id"`
	Type         SourceType `json:"type"`
	Location     string     `json:"location"`
	Available    bool       `json:"available"`
	IsPreferred  bool       `json:"is_preferred"`
	OrderIndex   int        `json:"order_index"`
	MetadataJSON string     `json:"metadata_json"`
	CreatedAt    int64      `json:"created_at"`
	UpdatedAt    int64      `json:"updated_at"`
}

// 持久化可跨 Resource 复用的标签身份。
type TagModel struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"created_at"`
}

// 持久化 Resource 与 Tag 的归属关系。
type TaggingModel struct {
	ResourceID string `json:"resource_id"`
	TagID      string `json:"tag_id"`
	CreatedAt  int64  `json:"created_at"`
}
