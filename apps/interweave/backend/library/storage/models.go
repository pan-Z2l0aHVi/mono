package storage

import "math/rand/v2"

// 区分本地与网络入口，避免用内容类型替代来源语义。
type SourceType string

const (
	SourceTypeFile SourceType = "file"
	SourceTypeURL  SourceType = "url"
)

// TagColor 是标签展示色的闭集词汇，按标签名唯一确定并持久化到 tag_colors。
// 库里只存 key：浅色/深色两套 chip 样式由前端按 key 映射，
// 因此调对比度或换主题不必迁移已落库的颜色。
type TagColor string

const (
	TagColorBlue    TagColor = "blue"
	TagColorEmerald TagColor = "emerald"
	TagColorTeal    TagColor = "teal"
	TagColorCyan    TagColor = "cyan"
	TagColorSky     TagColor = "sky"
	TagColorIndigo  TagColor = "indigo"
	TagColorViolet  TagColor = "violet"
	TagColorPurple  TagColor = "purple"
	TagColorPink    TagColor = "pink"
	TagColorRed     TagColor = "red"
	TagColorOrange  TagColor = "orange"
	TagColorAmber   TagColor = "amber"
	TagColorYellow  TagColor = "yellow"
	// TagColorGray 不参与随机分配：它是 DTO 边界归一与存量无色行唯一确定的落点，
	// 同时也是前端中性兜底所在的一档。常量与前端映射都保留，只是不进随机池。
	TagColorGray TagColor = "gray"
)

// TagColors 是随机取色与存量补色共用的取值范围：新增颜色必须同时登记在此，
// 否则随机分配会产出前端映射里不存在的 key。
//
// 刻意不含 TagColorGray，不要「补全」回去：灰色在原硬编码表里是归档、草稿这类
// 静态概念的语义信号，随机分配会让约 1/14 的标签——包括设计、紧急这类明显不该
// 看起来像归档的——渲染成中性灰；而且它是浅色态唯一低于 WCAG AA 4.5:1 的颜色。
var TagColors = []TagColor{
	TagColorBlue,
	TagColorEmerald,
	TagColorTeal,
	TagColorCyan,
	TagColorSky,
	TagColorIndigo,
	TagColorViolet,
	TagColorPurple,
	TagColorPink,
	TagColorRed,
	TagColorOrange,
	TagColorAmber,
	TagColorYellow,
}

// 标签颜色一经确定就固定下来：新标签在此抽取，之后只读不重掷。
func RandomTagColor() TagColor {
	return TagColors[rand.IntN(len(TagColors))]
}

// ResourceKind 是 Resource 展示层的权威闭集词汇，不写入 Source 或 Resource 表。
// 文件按扩展名映射，URL Source 固定为 web；未知文件扩展名归入 file。
type ResourceKind string

const (
	ResourceKindImage    ResourceKind = "image"
	ResourceKindVideo    ResourceKind = "video"
	ResourceKindAudio    ResourceKind = "audio"
	ResourceKindDocument ResourceKind = "document"
	ResourceKindWeb      ResourceKind = "web"
	ResourceKindJSON     ResourceKind = "json"
	ResourceKindFile     ResourceKind = "file"
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
// Color 不在 tags 表里：它按名称存在 tag_colors 表，由标签读取左连接带回，
// 使「同名标签同色」成为查询即得的事实而不是调用方自己拼的映射。
// 空值只作为「本库还没有这条颜色记录」的防御性状态存在，initSchema 的补色会消除它。
type TagModel struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Color     TagColor `json:"color"`
	CreatedAt int64    `json:"created_at"`
}

// 持久化 Resource 与 Tag 的归属关系。
type TaggingModel struct {
	ResourceID string `json:"resource_id"`
	TagID      string `json:"tag_id"`
	CreatedAt  int64  `json:"created_at"`
}

// 持久化 Tagging 的聚合结果：一个标签及其直接归属的资源数。
type TagAggregate struct {
	TagID         string
	Name          string
	ResourceCount int
}

// 持久化 Tagging 的共现聚合结果：一对标签及其共享的资源数。
type TagEdgeAggregate struct {
	SourceTagID string
	TargetTagID string
	Weight      int
}
