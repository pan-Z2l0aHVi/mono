package storage

import (
	"context"
	"database/sql"
	"strings"
)

// 同时适配 *sql.Row 与 *sql.Rows 的行扫描入口，避免读写路径各自复制扫描逻辑。
type rowScanner interface {
	Scan(dest ...any) error
}

// 为 IN 子句生成与参数数量一致的占位符；调用方需保证 n > 0。
func placeholders(n int) string {
	return strings.TrimSuffix(strings.Repeat("?,", n), ",")
}

// 遍历 rows 逐行扫描，统一收口 rows.Err() 检查与 nil→空切片归一；
// 新增列表扫描点默认继承正确语义，不必复制循环体。
func collectRows[T any](rows *sql.Rows, scan func(sc rowScanner) (T, error)) ([]T, error) {
	result := make([]T, 0)
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

// 扫描单列字符串行（如 ID 列表查询）。
func scanString(sc rowScanner) (string, error) {
	var id string
	err := sc.Scan(&id)
	return id, err
}

// 执行写语句并把“影响 0 行”映射为调用方指定的不存在哨兵，统一 not-found 语义。
func execAffected(ctx context.Context, q Queryer, notFound error, query string, args ...any) error {
	res, err := q.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return notFound
	}
	return nil
}

var _ Queryer = (*sql.DB)(nil)
var _ Queryer = (*sql.Tx)(nil)
