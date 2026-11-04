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

// ListByResource 读取单个 Resource 的全部归属，供替换式集合写路径做差集。
func (TaggingStore) ListByResource(ctx context.Context, q Queryer, resourceID string) ([]TaggingModel, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT resource_id, tag_id, created_at
		FROM taggings
		WHERE resource_id = ?
		ORDER BY created_at ASC, tag_id ASC
	`, resourceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectRows(rows, func(sc rowScanner) (TaggingModel, error) {
		var tagging TaggingModel
		err := sc.Scan(&tagging.ResourceID, &tagging.TagID, &tagging.CreatedAt)
		return tagging, err
	})
}

// DeleteExcept 解除单个 Resource 上不在 keepIDs 里的全部归属；keepIDs 为空时清空。
// 单条 SQL 在服务层事务内完成差集删除，不逐条往返。
func (TaggingStore) DeleteExcept(ctx context.Context, q Queryer, resourceID string, keepIDs []string) error {
	if len(keepIDs) == 0 {
		_, err := q.ExecContext(ctx, `
			DELETE FROM taggings WHERE resource_id = ?
		`, resourceID)
		return err
	}
	args := make([]any, 0, len(keepIDs)+1)
	args = append(args, resourceID)
	for _, id := range keepIDs {
		args = append(args, id)
	}
	_, err := q.ExecContext(ctx, `
		DELETE FROM taggings
		WHERE resource_id = ? AND tag_id NOT IN (`+placeholders(len(keepIDs))+`)
	`, args...)
	return err
}
