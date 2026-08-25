package storage

import (
	"context"
	"database/sql"
	"errors"
)

// 收敛 tags 表的读写与行扫描，向服务层隐藏 SQL 细节。
type TagStore struct{}

// 以标准名称读取标签，供同名复用；不存在时返回 ErrTagNotFound。
func (TagStore) GetByName(ctx context.Context, q Queryer, name string) (TagModel, error) {
	row := q.QueryRowContext(ctx, `
		SELECT id, name, created_at FROM tags WHERE name = ?
	`, name)
	tag, err := scanTag(row)
	if errors.Is(err, sql.ErrNoRows) {
		return TagModel{}, ErrTagNotFound
	}
	return tag, err
}

// 以稳定身份读取标签。
func (TagStore) Get(ctx context.Context, q Queryer, id string) (TagModel, error) {
	row := q.QueryRowContext(ctx, `
		SELECT id, name, created_at FROM tags WHERE id = ?
	`, id)
	tag, err := scanTag(row)
	if errors.Is(err, sql.ErrNoRows) {
		return TagModel{}, ErrTagNotFound
	}
	return tag, err
}

// 为新建标签持久化稳定身份。
func (TagStore) Insert(ctx context.Context, q Queryer, tag TagModel) error {
	_, err := q.ExecContext(ctx, `
		INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)
	`, tag.ID, tag.Name, tag.CreatedAt)
	return err
}

// 按名称排序读取前 limit 个标签，作为空查询时的建议。
func (TagStore) List(ctx context.Context, q Queryer, limit int) ([]TagModel, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT id, name, created_at FROM tags ORDER BY name ASC LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTags(rows)
}

// 按名称模糊匹配读取前 limit 个标签，作为用户输入时的建议。
func (TagStore) SearchByName(ctx context.Context, q Queryer, likePattern string, limit int) ([]TagModel, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT id, name, created_at FROM tags WHERE name LIKE ?
		ORDER BY name ASC LIMIT ?
	`, likePattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTags(rows)
}

// 读取某 Resource 直接拥有的全部标签，按归属时间排序。
func (TagStore) TagsByResource(ctx context.Context, q Queryer, resourceID string) ([]TagModel, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT t.id, t.name, t.created_at
		FROM tags t
		INNER JOIN taggings tg ON tg.tag_id = t.id
		WHERE tg.resource_id = ?
		ORDER BY tg.created_at ASC
	`, resourceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTags(rows)
}

func scanTag(sc rowScanner) (TagModel, error) {
	var tag TagModel
	err := sc.Scan(&tag.ID, &tag.Name, &tag.CreatedAt)
	return tag, err
}

func scanTags(rows *sql.Rows) ([]TagModel, error) {
	var result []TagModel
	for rows.Next() {
		tag, err := scanTag(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, tag)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if result == nil {
		result = []TagModel{}
	}
	return result, nil
}
