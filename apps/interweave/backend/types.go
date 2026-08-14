package backend

// nonNilSlice 规范 Wails 对外集合：空结果必须编码为 []，而不是 null。
func nonNilSlice[T any](items []T) []T {
	if items == nil {
		return []T{}
	}
	return items
}
