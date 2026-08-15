package backend

// 领域实体：与 Wails bindings 生成的 TS 类型一一对应。

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
