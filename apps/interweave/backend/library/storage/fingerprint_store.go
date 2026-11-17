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

// Get 读取 sourceID 的指纹；没有记录时返回零值与 nil 错误。
func (FingerprintStore) Get(ctx context.Context, q Queryer, sourceID string) (FingerprintState, error) {
	var state FingerprintState
	err := q.QueryRowContext(ctx, `SELECT size,modified,identity,changed,hash FROM source_fingerprints WHERE source_id=?`, sourceID).
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
