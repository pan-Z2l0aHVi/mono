package core

import "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"

// 领域类型以持久化模型为唯一载体，避免复制结构体；核心层统一从这里暴露语义。
type (
	Resource = storage.ResourceModel
	Source   = storage.SourceModel
	Tag      = storage.TagModel
)

// Map 推导所需的聚合结果。
type (
	TagAggregate = storage.TagAggregate
	TagEdge      = storage.TagEdgeAggregate
)

// ResourceView 是 Resource 及其入口与标签的装配视图，供外观层映射为前端 DTO。
type ResourceView struct {
	Resource Resource
	Sources  []Source
	Tags     []Tag
}

// GlobalMap 是全局主题地形的聚合视图。
type GlobalMap struct {
	TagNodes           []TagAggregate
	TagEdges           []TagEdge
	UnconnectedCount   int
	TotalResourceCount int
}

// LocalMap 是围绕单个主题的局部探索视图。
type LocalMap struct {
	FocusedTag      Tag
	Resources       []ResourceView
	CooccurringTags []TagAggregate
}
