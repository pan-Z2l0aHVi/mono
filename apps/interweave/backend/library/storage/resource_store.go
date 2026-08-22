package storage

import (
	"context"
	"database/sql"
	"errors"
)

// 收敛 resources 表的读写与行扫描，向服务层隐藏 SQL 细节。
type ResourceStore struct{}

// 为新建 Resource 持久化库内上下文。
func (ResourceStore) Insert(ctx context.Context, q Queryer, res ResourceModel) error {
	_, err := q.ExecContext(ctx, `
		INSERT INTO resources (id, title, note, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, res.ID, res.Title, res.Note, res.CreatedAt, res.UpdatedAt)
	return err
}

// 以稳定身份读取单个 Resource。
func (ResourceStore) Get(ctx context.Context, q Queryer, id string) (ResourceModel, error) {
	row := q.QueryRowContext(ctx, `
		SELECT id, title, note, created_at, updated_at
		FROM resources WHERE id = ?
	`, id)
	res, err := scanResource(row)
	if errors.Is(err, sql.ErrNoRows) {
		return ResourceModel{}, ErrResourceNotFound
	}
	return res, err
}

// 以最近纳入优先的顺序读取全部 Resource。
func (ResourceStore) List(ctx context.Context, q Queryer) ([]ResourceModel, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT id, title, note, created_at, updated_at
		FROM resources ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanResources(rows)
}

// 仅搜索用户维护的上下文与来源基础信息，不扩展为内容索引。
func (ResourceStore) Search(ctx context.Context, q Queryer, likePattern string) ([]ResourceModel, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT DISTINCT r.id, r.title, r.note, r.created_at, r.updated_at
		FROM resources r
		LEFT JOIN sources s ON s.resource_id = r.id
		LEFT JOIN taggings tg ON tg.resource_id = r.id
		LEFT JOIN tags t ON t.id = tg.tag_id
		WHERE r.title LIKE ?
		   OR r.note LIKE ?
		   OR t.name LIKE ?
		   OR s.location LIKE ?
		   OR s.metadata_json LIKE ?
		ORDER BY r.created_at DESC
	`, likePattern, likePattern, likePattern, likePattern, likePattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanResources(rows)
}

// 更新库内标题，不触碰外部内容；目标不存在时返回 ErrResourceNotFound。
func (ResourceStore) UpdateTitle(ctx context.Context, q Queryer, id string, title string, now int64) error {
	return execAffected(ctx, q, ErrResourceNotFound, `
		UPDATE resources SET title = ?, updated_at = ? WHERE id = ?
	`, title, now, id)
}

// 仅保存简短个人上下文；目标不存在时返回 ErrResourceNotFound。
func (ResourceStore) UpdateNote(ctx context.Context, q Queryer, id string, note string, now int64) error {
	return execAffected(ctx, q, ErrResourceNotFound, `
		UPDATE resources SET note = ?, updated_at = ? WHERE id = ?
	`, note, now, id)
}

// 从资源库移除记录；目标不存在时返回 ErrResourceNotFound。
func (ResourceStore) Delete(ctx context.Context, q Queryer, id string) error {
	return execAffected(ctx, q, ErrResourceNotFound, `DELETE FROM resources WHERE id = ?`, id)
}

// 仅判断目标是否存在于库内。
func (ResourceStore) Exists(ctx context.Context, q Queryer, id string) (bool, error) {
	var count int
	err := q.QueryRowContext(ctx, `SELECT COUNT(*) FROM resources WHERE id = ?`, id).Scan(&count)
	return count != 0, err
}

// 统计库内 Resource 总数。
func (ResourceStore) Count(ctx context.Context, q Queryer) (int, error) {
	var count int
	err := q.QueryRowContext(ctx, `SELECT COUNT(*) FROM resources`).Scan(&count)
	return count, err
}

func scanResource(sc rowScanner) (ResourceModel, error) {
	var res ResourceModel
	err := sc.Scan(&res.ID, &res.Title, &res.Note, &res.CreatedAt, &res.UpdatedAt)
	return res, err
}

func scanResources(rows *sql.Rows) ([]ResourceModel, error) {
	var result []ResourceModel
	for rows.Next() {
		res, err := scanResource(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, res)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if result == nil {
		result = []ResourceModel{}
	}
	return result, nil
}
