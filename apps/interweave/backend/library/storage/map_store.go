package storage

import (
	"context"
	"database/sql"
)

// 收敛 Map 推导所需的聚合查询，保持派生逻辑与业务层解耦。
type MapStore struct{}

// 统计没有任何标签归属的 Resource 数量，保留未连通资源的可见性。
func (MapStore) CountUnconnected(ctx context.Context, q Queryer) (int, error) {
	var count int
	err := q.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM resources r
		WHERE NOT EXISTS (SELECT 1 FROM taggings tg WHERE tg.resource_id = r.id)
	`).Scan(&count)
	return count, err
}

// 按直接归属数量返回主题节点，排除零引用标签。
func (MapStore) TagNodes(ctx context.Context, q Queryer) ([]TagAggregate, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT t.id, t.name, COUNT(tg.resource_id) AS res_count
		FROM tags t
		INNER JOIN taggings tg ON tg.tag_id = t.id
		GROUP BY t.id, t.name
		HAVING res_count > 0
		ORDER BY res_count DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTagAggregates(rows)
}

// 返回可追溯到共享资源的标签共现关系。
func (MapStore) TagEdges(ctx context.Context, q Queryer) ([]TagEdgeAggregate, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT tg1.tag_id, tg2.tag_id, COUNT(DISTINCT tg1.resource_id) as weight
		FROM taggings tg1
		INNER JOIN taggings tg2 ON tg1.resource_id = tg2.resource_id AND tg1.tag_id < tg2.tag_id
		GROUP BY tg1.tag_id, tg2.tag_id
		ORDER BY weight DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []TagEdgeAggregate
	for rows.Next() {
		var e TagEdgeAggregate
		if err := rows.Scan(&e.SourceTagID, &e.TargetTagID, &e.Weight); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if result == nil {
		result = []TagEdgeAggregate{}
	}
	return result, nil
}

// 按纳入时间返回直接拥有某标签的 Resource ID，作为局部探索的资源范围。
func (MapStore) ResourceIDsByTag(ctx context.Context, q Queryer, tagID string) ([]string, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT r.id
		FROM resources r
		INNER JOIN taggings tg ON tg.resource_id = r.id
		WHERE tg.tag_id = ?
		ORDER BY r.created_at DESC
	`, tagID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		result = append(result, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if result == nil {
		result = []string{}
	}
	return result, nil
}

// 返回与当前主题共享 Resource 的相邻标签，排除主题自身。
func (MapStore) CooccurringTags(ctx context.Context, q Queryer, tagID string) ([]TagAggregate, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT t.id, t.name, COUNT(DISTINCT tg2.resource_id) as weight
		FROM taggings tg1
		INNER JOIN taggings tg2 ON tg1.resource_id = tg2.resource_id
		INNER JOIN tags t ON t.id = tg2.tag_id
		WHERE tg1.tag_id = ? AND tg2.tag_id != ?
		GROUP BY t.id, t.name
		ORDER BY weight DESC
	`, tagID, tagID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTagAggregates(rows)
}

func scanTagAggregates(rows *sql.Rows) ([]TagAggregate, error) {
	var result []TagAggregate
	for rows.Next() {
		var n TagAggregate
		if err := rows.Scan(&n.TagID, &n.Name, &n.ResourceCount); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if result == nil {
		result = []TagAggregate{}
	}
	return result, nil
}
