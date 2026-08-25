package storage

import (
	"context"
	"database/sql"
)

// 同时适配 *sql.Row 与 *sql.Rows 的行扫描入口，避免读写路径各自复制扫描逻辑。
type rowScanner interface {
	Scan(dest ...any) error
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
