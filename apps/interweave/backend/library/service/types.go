package service

import "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"

// 为前端呈现 Resource 的外部入口。
type SourceDTO struct {
	ID           string             `json:"id"`
	ResourceID   string             `json:"resource_id"`
	Type         storage.SourceType `json:"type"`
	Location     string             `json:"location"`
	Available    bool               `json:"available"`
	IsPreferred  bool               `json:"is_preferred"`
	OrderIndex   int                `json:"order_index"`
	MetadataJSON string             `json:"metadata_json"`
	CreatedAt    int64              `json:"created_at"`
	UpdatedAt    int64              `json:"updated_at"`
}

// 为前端呈现可复用的语义标签。
type TagDTO struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt int64  `json:"created_at"`
}

// 为前端提供完整但不承载外部内容的资源视图。
type ResourceDTO struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Note        string      `json:"note"`
	CreatedAt   int64       `json:"created_at"`
	UpdatedAt   int64       `json:"updated_at"`
	Sources     []SourceDTO `json:"sources"`
	Tags        []TagDTO    `json:"tags"`
	PreferredID string      `json:"preferred_source_id"`
}

// 为 Map 提供主题聚合视图。
type TagNodeDTO struct {
	TagID         string `json:"tag_id"`
	Name          string `json:"name"`
	ResourceCount int    `json:"resource_count"`
}

// 为 Map 保留可解释的标签关联。
type TagEdgeDTO struct {
	SourceTagID string `json:"source_tag_id"`
	TargetTagID string `json:"target_tag_id"`
	Weight      int    `json:"weight"` // count of shared resources
}

// 为 Map 的全局概览提供聚合结果。
type GlobalMapDTO struct {
	TagNodes           []TagNodeDTO `json:"tag_nodes"`
	TagEdges           []TagEdgeDTO `json:"tag_edges"`
	UnconnectedCount   int          `json:"unconnected_resource_count"`
	TotalResourceCount int          `json:"total_resource_count"`
}

// 为围绕单个主题的探索提供局部上下文。
type LocalMapDTO struct {
	FocusedTag      TagDTO        `json:"focused_tag"`
	Resources       []ResourceDTO `json:"resources"`
	CooccurringTags []TagNodeDTO  `json:"cooccurring_tags"`
}
