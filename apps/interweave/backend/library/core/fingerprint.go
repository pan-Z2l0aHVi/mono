package core

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// fileFingerprint 是 storage 层快照类型在 core 内的惯用名。
type fileFingerprint = storage.FingerprintState

func fingerprintInfo(path string, info os.FileInfo) fileFingerprint {
	identity, changed := fileIdentity(path, info)
	return fileFingerprint{Size: info.Size(), Modified: info.ModTime().UnixNano(), Identity: identity, Changed: changed}
}
func sameFileState(a, b fileFingerprint) bool {
	return a.Size == b.Size && a.Modified == b.Modified && a.Identity == b.Identity && a.Changed == b.Changed
}
func hashFile(ctx context.Context, path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	buf := make([]byte, 256*1024)
	for {
		if err := ctx.Err(); err != nil {
			return "", err
		}
		n, e := f.Read(buf)
		if n > 0 {
			_, _ = h.Write(buf[:n])
		}
		if e == io.EOF {
			break
		}
		if e != nil {
			return "", e
		}
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// FingerprintRecorder 拥有 source_fingerprints 的全部写入时机：
// 同步快照便宜的文件属性，再把内容哈希交给后台，不占用调用方的关键路径。
// 触发条件（纳入、手动刷新、可用性恢复）仍由各产品入口决定，机制只在这里有一份。
type FingerprintRecorder struct {
	db    *storage.DB
	store storage.FingerprintStore
}

func newFingerprintRecorder(db *storage.DB) *FingerprintRecorder {
	return &FingerprintRecorder{db: db}
}

// Record 为仍可服务的文件快照属性并调度哈希；不可服务（含权限/I/O 错误）时不记录。
func (r *FingerprintRecorder) Record(sourceID, location string) {
	info, err := os.Stat(location)
	if ClassifyFileStat(err, info) != FileServable {
		return
	}
	state := fingerprintInfo(location, info)
	ctx := context.Background()
	err = r.db.WithTx(ctx, func(tx *sql.Tx) error {
		return r.store.Upsert(ctx, tx, sourceID, location, state)
	})
	if err != nil {
		log.Printf("interweave: fingerprint attributes: %v", err)
		return
	}
	r.db.ScheduleBackground("fingerprint:"+sourceID, func(ctx context.Context) {
		r.hashIfStillCurrent(ctx, sourceID, location, state)
	})
}

// hashIfStillCurrent 只在记录仍对应 state 且尚无 hash 时计算并写入；
// 读完文件后属性变化则放弃，下一次 Record 会针对新属性重来。
func (r *FingerprintRecorder) hashIfStillCurrent(ctx context.Context, sourceID, location string, state fileFingerprint) {
	current, ok, err := r.store.HashIfStateMatches(ctx, r.db.SqlDB(), sourceID, location, state)
	if err != nil || !ok || current != "" {
		return
	}
	hash, err := hashFile(ctx, location)
	if err != nil {
		if ctx.Err() == nil {
			log.Printf("interweave: fingerprint hash %s: %v", location, err)
		}
		return
	}
	after, err := os.Stat(location)
	if ClassifyFileStat(err, after) != FileServable || !sameFileState(state, fingerprintInfo(location, after)) {
		return
	}
	err = r.db.WithTx(ctx, func(tx *sql.Tx) error {
		return r.store.UpdateHashIfStateMatches(ctx, tx, sourceID, location, state, hash)
	})
	if err != nil {
		log.Printf("interweave: fingerprint hash: %v", err)
	}
}

// Backfill 为库内已可用的文件 Source 补齐指纹，由装配层在启动时调度。
func (r *FingerprintRecorder) Backfill(ctx context.Context) {
	sources, err := (storage.SourceStore{}).ListFileSources(ctx, r.db.SqlDB())
	if err != nil {
		log.Printf("interweave: fingerprint backfill: %v", err)
		return
	}
	for _, src := range sources {
		if ctx.Err() != nil {
			return
		}
		if src.Available {
			r.Record(src.ID, src.Location)
		}
	}
}

// Get 读取 sourceID 的指纹；没有记录时返回零值。
func (r *FingerprintRecorder) Get(ctx context.Context, sourceID string) (fileFingerprint, error) {
	state, err := r.store.Get(ctx, r.db.SqlDB(), sourceID)
	if err != nil {
		return fileFingerprint{}, fmt.Errorf("read fingerprint: %w", err)
	}
	return state, nil
}
