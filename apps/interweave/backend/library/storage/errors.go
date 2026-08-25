package storage

import "errors"

// 领域查询失败哨兵：上层据具体类型映射为用户可见文案，不把 SQL 细节泄漏给调用方。
var (
	// 目标 Resource 不存在。
	ErrResourceNotFound = errors.New("resource not found")
	// 目标 Source 不存在。
	ErrSourceNotFound = errors.New("source not found")
	// 目标 Tag 不存在。
	ErrTagNotFound = errors.New("tag not found")
	// 目标 Tagging 归属不存在。
	ErrTaggingNotFound = errors.New("tagging not found")
)
