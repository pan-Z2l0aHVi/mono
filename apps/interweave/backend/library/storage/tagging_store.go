package storage

import (
	"context"
)

// 收敛 taggings 归属表的写操作，向服务层隐藏 SQL 细节。
type TaggingStore struct{}

// 建立 Resource 与 Tag 的归属；重复归属被忽略。
func (TaggingStore) Insert(ctx context.Context, q Queryer, tagging TaggingModel) error {
	_, err := q.ExecContext(ctx, `
		INSERT OR IGNORE INTO taggings (resource_id, tag_id, created_at)
		VALUES (?, ?, ?)
	`, tagging.ResourceID, tagging.TagID, tagging.CreatedAt)
	return err
}

// 解除单个 Resource 的归属；不存在时返回 ErrTaggingNotFound。
func (TaggingStore) Delete(ctx context.Context, q Queryer, resourceID string, tagID string) error {
	return execAffected(ctx, q, ErrTaggingNotFound, `
		DELETE FROM taggings WHERE resource_id = ? AND tag_id = ?
	`, resourceID, tagID)
}
