package storage

import (
	"context"
	"database/sql"
	"errors"
)

// 收敛 sources 表的读写、bool↔int 转换与行扫描，向服务层隐藏 SQL 细节。
type SourceStore struct{}

// 为 Resource 持久化一个外部入口。
func (SourceStore) Insert(ctx context.Context, q Queryer, src SourceModel) error {
	_, err := q.ExecContext(ctx, `
		INSERT INTO sources (id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, src.ID, src.ResourceID, src.Type, src.Location, boolToInt(src.Available), boolToInt(src.IsPreferred), src.OrderIndex, src.MetadataJSON, src.CreatedAt, src.UpdatedAt)
	return err
}

// 以稳定身份读取单个 Source。
func (SourceStore) Get(ctx context.Context, q Queryer, id string) (SourceModel, error) {
	row := q.QueryRowContext(ctx, `
		SELECT id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at
		FROM sources WHERE id = ?
	`, id)
	src, err := scanSource(row)
	if errors.Is(err, sql.ErrNoRows) {
		return SourceModel{}, ErrSourceNotFound
	}
	return src, err
}

// 按添加顺位读取某 Resource 的全部 Source。
func (SourceStore) ListByResource(ctx context.Context, q Queryer, resourceID string) ([]SourceModel, error) {
	rows, err := q.QueryContext(ctx, `
		SELECT id, resource_id, type, location, available, is_preferred, order_index, metadata_json, created_at, updated_at
		FROM sources WHERE resource_id = ?
		ORDER BY order_index ASC
	`, resourceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []SourceModel
	for rows.Next() {
		src, err := scanSource(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, src)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if result == nil {
		result = []SourceModel{}
	}
	return result, nil
}

// 原子替换 Source 自身的入口数据，保留其顺位与首选角色；目标不存在时返回 ErrSourceNotFound。
func (SourceStore) Replace(ctx context.Context, q Queryer, id string, srcType SourceType, location string, available bool, metadataJSON string, now int64) error {
	return execAffected(ctx, q, ErrSourceNotFound, `
		UPDATE sources
		SET type = ?, location = ?, available = ?, metadata_json = ?, updated_at = ?
		WHERE id = ?
	`, srcType, location, boolToInt(available), metadataJSON, now, id)
}

// 仅在用户明确刷新时更新入口可用状态与展示元数据。
func (SourceStore) UpdateAvailability(ctx context.Context, q Queryer, id string, available bool, metadataJSON string, now int64) error {
	return execAffected(ctx, q, ErrSourceNotFound, `
		UPDATE sources
		SET available = ?, metadata_json = ?, updated_at = ?
		WHERE id = ?
	`, boolToInt(available), metadataJSON, now, id)
}

// 清除某 Resource 的当前首选标记，维持唯一首选的不变量。
func (SourceStore) ClearPreferred(ctx context.Context, q Queryer, resourceID string, now int64) error {
	_, err := q.ExecContext(ctx, `
		UPDATE sources SET is_preferred = 0, updated_at = ? WHERE resource_id = ?
	`, now, resourceID)
	return err
}

// 将指定 Source 标记为 Resource 的首选；不归属该 Resource 时返回 ErrSourceNotFound。
func (SourceStore) SetPreferred(ctx context.Context, q Queryer, id string, resourceID string, now int64) error {
	return execAffected(ctx, q, ErrSourceNotFound, `
		UPDATE sources SET is_preferred = 1, updated_at = ? WHERE id = ? AND resource_id = ?
	`, now, id, resourceID)
}

// 按添加顺位返回 Resource 的下一个首选 Source。
func (SourceStore) NextPreferredID(ctx context.Context, q Queryer, resourceID string) (string, error) {
	var id string
	err := q.QueryRowContext(ctx, `
		SELECT id FROM sources WHERE resource_id = ? ORDER BY order_index ASC LIMIT 1
	`, resourceID).Scan(&id)
	return id, err
}

// 返回某 Resource 当前最大的添加顺位；没有 Source 时为 -1。
func (SourceStore) MaxOrder(ctx context.Context, q Queryer, resourceID string) (int, error) {
	var maxOrder int
	err := q.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(order_index), -1) FROM sources WHERE resource_id = ?
	`, resourceID).Scan(&maxOrder)
	return maxOrder, err
}

// 统计某 Resource 当前的 Source 数量。
func (SourceStore) CountByResource(ctx context.Context, q Queryer, resourceID string) (int, error) {
	var count int
	err := q.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM sources WHERE resource_id = ?
	`, resourceID).Scan(&count)
	return count, err
}

// 仅移除 Source 记录；调用方需先保证 Resource 至少保留一个入口。
func (SourceStore) Delete(ctx context.Context, q Queryer, id string) error {
	_, err := q.ExecContext(ctx, `DELETE FROM sources WHERE id = ?`, id)
	return err
}

func scanSource(sc rowScanner) (SourceModel, error) {
	var src SourceModel
	var availInt, prefInt int
	err := sc.Scan(&src.ID, &src.ResourceID, &src.Type, &src.Location, &availInt, &prefInt, &src.OrderIndex, &src.MetadataJSON, &src.CreatedAt, &src.UpdatedAt)
	if err != nil {
		return SourceModel{}, err
	}
	src.Available = availInt != 0
	src.IsPreferred = prefInt != 0
	return src, nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
