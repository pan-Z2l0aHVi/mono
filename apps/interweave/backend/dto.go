package backend

// API 契约：请求/响应 DTO，与 Wails bindings 生成的 TS 类型对应。

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

// SettingsPatch 是设置更新补丁（指针字段表示"仅更新提供的项"）。
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
