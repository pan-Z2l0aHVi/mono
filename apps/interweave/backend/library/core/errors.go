package core

import (
	"errors"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 领域错误哨兵：其文案即前端可见文案，由外观层透传，不额外映射。
var (
	// 目标 Resource 不存在。
	ErrResourceNotFound = errors.New("resource not found")
	// 目标 Source 不存在。
	ErrSourceNotFound = errors.New("source not found")
	// 首选切换目标不属于该 Resource。
	ErrSourceNotFoundOnResource = errors.New("source not found on resource")
	// 目标 Tag 不存在。
	ErrTagNotFound = errors.New("tag not found")
	// 目标 Tagging 归属不存在。
	ErrTaggingNotFound = errors.New("tagging not found on resource")
	// Resource 必须保留至少一个入口。
	ErrCannotRemoveOnlySource = errors.New("cannot remove the only source of a resource; delete the resource instead")
	// 仅 URL 入口支持刷新展示信息。
	ErrOnlyURLSourceRefreshable = errors.New("only URL sources can be refreshed")
	// Resource 标题不能为空。
	ErrResourceTitleEmpty = errors.New("resource title cannot be empty")
)

// 把持久化层的 not-found 哨兵归一为核心层哨兵，隔离存储错误语义。
func mapNotFound(err error) error {
	switch {
	case errors.Is(err, storage.ErrResourceNotFound):
		return ErrResourceNotFound
	case errors.Is(err, storage.ErrSourceNotFound):
		return ErrSourceNotFound
	case errors.Is(err, storage.ErrTagNotFound):
		return ErrTagNotFound
	case errors.Is(err, storage.ErrTaggingNotFound):
		return ErrTaggingNotFound
	default:
		return err
	}
}
