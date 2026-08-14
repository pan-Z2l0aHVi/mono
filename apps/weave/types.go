package main

// nonNilSlice 规范 Wails 对外集合：空结果必须编码为 []，而不是 null。
func nonNilSlice[T any](items []T) []T {
	if items == nil {
		return []T{}
	}
	return items
}

// 领域 DTO：与 Wails bindings 生成的 TS 类型一一对应，字段使用 json tag 保证序列化稳定。

// Item 是库中的中心实体（可寻址资源）：file 或 url。
type Item struct {
	ID         string   `json:"id"`
	Kind       string   `json:"kind"` // file | url
	Name       string   `json:"name"`
	Locator    string   `json:"locator"`
	Mime       string   `json:"mime"`
	Size       int64    `json:"size"`
	Mtime      int64    `json:"mtime"` // unix 毫秒
	Width      int      `json:"width"`
	Height     int      `json:"height"`
	DurationMs int64    `json:"durationMs"`
	Status     string   `json:"status"` // ok | broken
	Tags       []TagRef `json:"tags"`
	CreatedAt  int64    `json:"createdAt"`
	UpdatedAt  int64    `json:"updatedAt"`
}

// TagRef 是条目上标签的轻量引用。
type TagRef struct {
	ID   string `json:"id"`
	Path string `json:"path"`
}

// Tag 是路径式层级标签节点；Children 仅在构建树时填充。
type Tag struct {
	ID        string `json:"id"`
	Name      string `json:"name"` // 路径最后一段
	Path      string `json:"path"` // 完整路径（父/子/孙）
	ParentID  string `json:"parentId"`
	ItemCount int    `json:"itemCount"`
	Children  []*Tag `json:"children,omitempty"`
}

// WatchRoot 是用户登记的监听根目录。
type WatchRoot struct {
	ID        string `json:"id"`
	Path      string `json:"path"`
	ItemCount int    `json:"itemCount"`
}

// RepairItem 是修复中心的断链工作项。
type RepairItem struct {
	ID         string   `json:"id"`
	ItemID     string   `json:"itemId"`
	ItemName   string   `json:"itemName"`
	ItemPath   string   `json:"itemPath"`
	State      string   `json:"state"` // open | auto_fixed | manual_fixed | dismissed
	Candidates []string `json:"candidates"`
	CreatedAt  int64    `json:"createdAt"`
	UpdatedAt  int64    `json:"updatedAt"`
}

// Candidate 是断链修复的候选位置。
type Candidate struct {
	Path  string `json:"path"`
	Score int    `json:"score"`
	Note  string `json:"note"`
}

// Settings 是应用设置。
type Settings struct {
	McpEnabled    bool   `json:"mcpEnabled"`
	McpRunning    bool   `json:"mcpRunning"`
	McpToken      string `json:"mcpToken"`
	BaseURL       string `json:"baseUrl"` // 本地服务（MCP+media）地址
	McpURL        string `json:"mcpUrl"`
	MediaURL      string `json:"mediaUrl"`
	LibraryPath   string `json:"libraryPath"`
	RescanOnStart bool   `json:"rescanOnStart"`
}

// SettingsPatch 是设置更新补丁（指针字段表示“仅更新提供的项”）。
type SettingsPatch struct {
	McpEnabled    *bool `json:"mcpEnabled,omitempty"`
	RescanOnStart *bool `json:"rescanOnStart,omitempty"`
}

// Stats 是库统计信息。
type Stats struct {
	ItemCount       int   `json:"itemCount"`
	TotalSize       int64 `json:"totalSize"`
	FileCount       int   `json:"fileCount"`
	URLCount        int   `json:"urlCount"`
	BrokenCount     int   `json:"brokenCount"`
	TagCount        int   `json:"tagCount"`
	WatchRootCount  int   `json:"watchRootCount"`
	RepairOpenCount int   `json:"repairOpenCount"`
}

// AddResult 是入库操作的结果摘要。
type AddResult struct {
	Added   int    `json:"added"`
	Skipped int    `json:"skipped"`
	Failed  int    `json:"failed"`
	Items   []Item `json:"items"`
}

// RescanResult 是全量扫描的结果摘要。
type RescanResult struct {
	Verified int `json:"verified"`
	Broken   int `json:"broken"`
	Repaired int `json:"repaired"`
	NewItems int `json:"newItems"`
}

// ListQuery 是条目列表的过滤条件。
type ListQuery struct {
	TagPath string `json:"tagPath,omitempty"` // 包含子孙
	Search  string `json:"search,omitempty"`  // 名称模糊匹配
	Kind    string `json:"kind,omitempty"`    // file | url | ""
	Status  string `json:"status,omitempty"`  // ok | broken | ""
	Limit   int    `json:"limit,omitempty"`
	Offset  int    `json:"offset,omitempty"`
}
