package storage

import (
	"context"
	"database/sql"
	"errors"
)

// 收敛 tags 表的读写与行扫描，向服务层隐藏 SQL 细节。
type TagStore struct{}

// 标签展示色不在 tags 表里，所有标签读取都左连接补色。
// COALESCE 让缺色行退化为无色而不是扫描失败：补色是写路径按需发生的事，
// 读路径不该为了自愈而写库。
const tagSelect = `
	SELECT t.id, t.name, COALESCE(c.color, ''), t.created_at
	FROM tags t
	LEFT JOIN tag_colors c ON c.name = t.name
`

// 以标准名称读取标签，供同名复用；不存在时返回 ErrTagNotFound。
func (TagStore) GetByName(ctx context.Context, q Queryer, name string) (TagModel, error) {
	row := q.QueryRowContext(ctx, tagSelect+`
		WHERE t.name = ?
	`, name)
	tag, err := scanTag(row)
	if errors.Is(err, sql.ErrNoRows) {
		return TagModel{}, ErrTagNotFound
	}
	return tag, err
}

// 以稳定身份读取标签。
func (TagStore) Get(ctx context.Context, q Queryer, id string) (TagModel, error) {
	row := q.QueryRowContext(ctx, tagSelect+`
		WHERE t.id = ?
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

// 为标签确定展示色；同名标签已有颜色时保持原值。
// 覆盖会让已确定颜色的标签改色，破坏「同名标签终身同色」，因此这里只补不写。
func (TagStore) EnsureColor(ctx context.Context, q Queryer, name string, color TagColor) error {
	_, err := q.ExecContext(ctx, `
		INSERT OR IGNORE INTO tag_colors (name, color) VALUES (?, ?)
	`, name, color)
	return err
}

// 为库里尚无颜色的标签各补一个颜色。存量库在升级后第一次启动时走这条路，
// 之后每次启动都是幂等重放（OR IGNORE 全部命中），已确定的颜色不会变。
// 一次补完而不是等下次打标再补：后者会让用户看到「半灰的库 + 偶尔跳色的标签」。
func (TagStore) BackfillTagColors(ctx context.Context, q Queryer) error {
	rows, err := q.QueryContext(ctx, `
		SELECT t.name FROM tags t
		LEFT JOIN tag_colors c ON c.name = t.name
		WHERE c.name IS NULL
	`)
	if err != nil {
		return err
	}
	var missing []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			_ = rows.Close()
			return err
		}
		missing = append(missing, name)
	}
	if err := rows.Err(); err != nil {
		_ = rows.Close()
		return err
	}
	// 读完再写：同连接上边遍历结果集边写会与 SQLite 的语句状态冲突。
	if err := rows.Close(); err != nil {
		return err
	}

	for _, name := range missing {
		if err := (TagStore{}).EnsureColor(ctx, q, name, RandomTagColor()); err != nil {
			return err
		}
	}
	return nil
}

// 按名称排序读取前 limit 个标签，作为空查询时的建议。
func (TagStore) List(ctx context.Context, q Queryer, limit int) ([]TagModel, error) {
	rows, err := q.QueryContext(ctx, tagSelect+`
		ORDER BY t.name ASC LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectRows(rows, scanTag)
}

// 按名称模糊匹配读取前 limit 个标签，作为用户输入时的建议。
func (TagStore) SearchByName(ctx context.Context, q Queryer, likePattern string, limit int) ([]TagModel, error) {
	rows, err := q.QueryContext(ctx, tagSelect+`
		WHERE t.name LIKE ? ESCAPE '\'
		ORDER BY t.name ASC LIMIT ?
	`, likePattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectRows(rows, scanTag)
}

// 批量读取多个 Resource 的标签并按资源分组，各自保持归属时间顺序；
// 供批量视图装配避免逐资源查询。
func (TagStore) TagsByResources(ctx context.Context, q Queryer, resourceIDs []string) (map[string][]TagModel, error) {
	result := make(map[string][]TagModel, len(resourceIDs))
	if len(resourceIDs) == 0 {
		return result, nil
	}

	args := make([]any, len(resourceIDs))
	for i, id := range resourceIDs {
		args[i] = id
	}
	rows, err := q.QueryContext(ctx, `
		SELECT tg.resource_id, t.id, t.name, COALESCE(c.color, ''), t.created_at
		FROM tags t
		INNER JOIN taggings tg ON tg.tag_id = t.id
		LEFT JOIN tag_colors c ON c.name = t.name
		WHERE tg.resource_id IN (`+placeholders(len(resourceIDs))+`)
		ORDER BY tg.resource_id ASC, tg.created_at ASC
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var resourceID string
		var tag TagModel
		if err := rows.Scan(&resourceID, &tag.ID, &tag.Name, &tag.Color, &tag.CreatedAt); err != nil {
			return nil, err
		}
		result[resourceID] = append(result[resourceID], tag)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func scanTag(sc rowScanner) (TagModel, error) {
	var tag TagModel
	err := sc.Scan(&tag.ID, &tag.Name, &tag.Color, &tag.CreatedAt)
	return tag, err
}
