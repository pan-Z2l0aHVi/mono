package storage

import (
	"context"
	"database/sql"
	"errors"
)

// FingerprintState 是文件入口在某一时刻的属性快照与内容哈希。
// 属性（Size/Modified/Identity/Changed）便宜、同步取得；Hash 由后台补齐，空串表示尚未计算。
type FingerprintState struct {
	Size     int64  `json:"size"`
	Modified int64  `json:"modified"`
	Identity string `json:"identity"`
	Changed  int64  `json:"changed"`
	Hash     string `json:"hash"`
}

// FingerprintStore 收敛 source_fingerprints 表的读写，向 core 隐藏 SQL 细节。
type FingerprintStore struct{}

// FingerprintRecord 是 source_fingerprints 的一行完整快照（含 location 与 source_id）。
type FingerprintRecord struct {
	SourceID string
	Location string
	State    FingerprintState
}

// FingerprintBackfill 是回填批次里的一条待写回记录：State 是本次哈希结果及其属性，
// HadRecord 为 false 表示预过滤时无记录（走 INSERT 分支）；为 true 时 Old 是预过滤
// 读到的旧快照，CAS 以它为基准判断这批结果是否已经滞留。
type FingerprintBackfill struct {
	SourceID  string
	Location  string
	State     FingerprintState
	HadRecord bool
	Old       FingerprintRecord
}

// Upsert 为仍指向 location 的文件 Source 写入属性快照；source 已不存在或位置已变时不写。
// 属性或位置发生变化时清空旧 hash，避免旧内容的哈希挂在新属性上。
func (FingerprintStore) Upsert(ctx context.Context, q Queryer, sourceID, location string, state FingerprintState) error {
	_, err := q.ExecContext(ctx, `INSERT INTO source_fingerprints (source_id, location, size, modified, identity, changed, hash)
 SELECT id, location, ?, ?, ?, ?, '' FROM sources WHERE id = ? AND type = 'file' AND location = ?
 ON CONFLICT(source_id) DO UPDATE SET location=excluded.location, size=excluded.size, modified=excluded.modified, identity=excluded.identity, changed=excluded.changed,
 hash=CASE WHEN source_fingerprints.location=excluded.location AND source_fingerprints.size=excluded.size AND source_fingerprints.modified=excluded.modified AND source_fingerprints.identity=excluded.identity AND source_fingerprints.changed=excluded.changed THEN source_fingerprints.hash ELSE '' END`,
		state.Size, state.Modified, state.Identity, state.Changed, sourceID, location)
	return err
}

// Get 读取 sourceID 指向当前位置的指纹；没有记录、source 已不是文件入口或记录的位置
// 与 source 当前位置不一致（入口被替换后旧快照尚未刷新）时返回零值与 nil 错误。
func (FingerprintStore) Get(ctx context.Context, q Queryer, sourceID string) (FingerprintState, error) {
	var state FingerprintState
	err := q.QueryRowContext(ctx, `SELECT f.size,f.modified,f.identity,f.changed,f.hash FROM source_fingerprints f
 JOIN sources s ON s.id = f.source_id WHERE f.source_id=? AND s.type='file' AND s.location=f.location`, sourceID).
		Scan(&state.Size, &state.Modified, &state.Identity, &state.Changed, &state.Hash)
	if errors.Is(err, sql.ErrNoRows) {
		return FingerprintState{}, nil
	}
	return state, err
}

// HashIfStateMatches 返回与给定位置和属性完全一致的那条记录的 hash；
// 记录不存在或属性已变时 ok 为 false。
func (FingerprintStore) HashIfStateMatches(ctx context.Context, q Queryer, sourceID, location string, state FingerprintState) (hash string, ok bool, err error) {
	err = q.QueryRowContext(ctx, `SELECT hash FROM source_fingerprints WHERE source_id=? AND location=? AND size=? AND modified=? AND identity=? AND changed=?`,
		sourceID, location, state.Size, state.Modified, state.Identity, state.Changed).Scan(&hash)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return hash, true, nil
}

// UpdateHashIfStateMatches 只在记录属性仍与 state 一致、且 source 仍是指向该位置的文件时写入 hash；
// 否则静默不写：哈希是针对那一刻的属性算的，属性变了就作废。
func (FingerprintStore) UpdateHashIfStateMatches(ctx context.Context, q Queryer, sourceID, location string, state FingerprintState, hash string) error {
	_, err := q.ExecContext(ctx, `UPDATE source_fingerprints SET hash=? WHERE source_id=? AND location=? AND size=? AND modified=? AND identity=? AND changed=? AND EXISTS (SELECT 1 FROM sources WHERE id=? AND type='file' AND location=?)`,
		hash, sourceID, location, state.Size, state.Modified, state.Identity, state.Changed, sourceID, location)
	return err
}

// ListAll 读取全部指纹记录的 7 列，供回填预过滤一次性建立快照基线，冷启动未变更
// 文件因此只需一次只读查询。
func (FingerprintStore) ListAll(ctx context.Context, q Queryer) ([]FingerprintRecord, error) {
	rows, err := q.QueryContext(ctx, `SELECT source_id, location, size, modified, identity, changed, hash FROM source_fingerprints`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return collectRows(rows, func(sc rowScanner) (FingerprintRecord, error) {
		var rec FingerprintRecord
		err := sc.Scan(&rec.SourceID, &rec.Location, &rec.State.Size, &rec.State.Modified, &rec.State.Identity, &rec.State.Changed, &rec.State.Hash)
		return rec, err
	})
}

// WriteBackfill 在调用方的单次事务内写回一批回填结果，逐条走条件 CAS：
// 情况 A（预过滤时无记录）只补写「目标行仍无 hash 且属性与本次一致」的行，
// 且 source 仍是指向该位置的文件入口，否则 SELECT 无行、INSERT 整条不生效；
// 情况 B（预过滤时有旧记录）只在库中仍是旧快照、且 source 未被替换或移动时更新。
// 由此，滞留批次永远不会覆盖 RefreshSource / Watcher 在预过滤之后并发写入的新指纹。
func (FingerprintStore) WriteBackfill(ctx context.Context, q Queryer, batch []FingerprintBackfill) error {
	for _, item := range batch {
		var err error
		if item.HadRecord {
			_, err = q.ExecContext(ctx, `UPDATE source_fingerprints
			 SET location=?, size=?, modified=?, identity=?, changed=?, hash=?
			 WHERE source_id=?
			   AND location=? AND size=? AND modified=? AND identity=? AND changed=?
			   AND EXISTS (SELECT 1 FROM sources WHERE id=? AND type='file' AND location=?)`,
				item.Location, item.State.Size, item.State.Modified, item.State.Identity, item.State.Changed, item.State.Hash,
				item.SourceID,
				item.Old.Location, item.Old.State.Size, item.Old.State.Modified, item.Old.State.Identity, item.Old.State.Changed,
				item.SourceID, item.Location)
		} else {
			_, err = q.ExecContext(ctx, `INSERT INTO source_fingerprints (source_id, location, size, modified, identity, changed, hash)
			 SELECT id, location, ?, ?, ?, ?, ? FROM sources WHERE id = ? AND type = 'file' AND location = ?
			 ON CONFLICT(source_id) DO UPDATE SET hash = excluded.hash
			 WHERE source_fingerprints.hash = ''
			   AND source_fingerprints.location = excluded.location
			   AND source_fingerprints.size     = excluded.size
			   AND source_fingerprints.modified = excluded.modified
			   AND source_fingerprints.identity = excluded.identity
			   AND source_fingerprints.changed  = excluded.changed`,
				item.State.Size, item.State.Modified, item.State.Identity, item.State.Changed, item.State.Hash,
				item.SourceID, item.Location)
		}
		if err != nil {
			return err
		}
	}
	return nil
}
