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

type fileFingerprint struct {
	Size     int64  `json:"size"`
	Modified int64  `json:"modified"`
	Identity string `json:"identity"`
	Changed  int64  `json:"changed"`
	Hash     string `json:"hash"`
}

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

// recordFingerprint snapshots inexpensive attributes synchronously, then hashes outside the caller's critical path.
func recordFingerprint(db *storage.DB, sourceID, path string) {
	info, err := os.Stat(path)
	if err != nil || !info.Mode().IsRegular() {
		return
	}
	state := fingerprintInfo(path, info)
	ctx := context.Background()
	err = db.WithTx(ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, `INSERT INTO source_fingerprints (source_id, location, size, modified, identity, changed, hash)
 SELECT id, location, ?, ?, ?, ?, '' FROM sources WHERE id = ? AND type = 'file' AND location = ?
 ON CONFLICT(source_id) DO UPDATE SET location=excluded.location, size=excluded.size, modified=excluded.modified, identity=excluded.identity, changed=excluded.changed,
 hash=CASE WHEN source_fingerprints.location=excluded.location AND source_fingerprints.size=excluded.size AND source_fingerprints.modified=excluded.modified AND source_fingerprints.identity=excluded.identity AND source_fingerprints.changed=excluded.changed THEN source_fingerprints.hash ELSE '' END`, state.Size, state.Modified, state.Identity, state.Changed, sourceID, path)
		return err
	})
	if err != nil {
		log.Printf("interweave: fingerprint attributes: %v", err)
		return
	}
	db.ScheduleBackground("fingerprint:"+sourceID, func(ctx context.Context) {
		var currentHash string
		err := db.SqlDB().QueryRowContext(ctx, `SELECT hash FROM source_fingerprints WHERE source_id=? AND location=? AND size=? AND modified=? AND identity=? AND changed=?`, sourceID, path, state.Size, state.Modified, state.Identity, state.Changed).Scan(&currentHash)
		if err != nil || currentHash != "" {
			return
		}
		hash, err := hashFile(ctx, path)
		if err != nil {
			if ctx.Err() == nil {
				log.Printf("interweave: fingerprint hash %s: %v", path, err)
			}
			return
		}
		after, err := os.Stat(path)
		if err != nil || !after.Mode().IsRegular() || !sameFileState(state, fingerprintInfo(path, after)) {
			return
		}
		err = db.WithTx(ctx, func(tx *sql.Tx) error {
			_, err := tx.ExecContext(ctx, `UPDATE source_fingerprints SET hash=? WHERE source_id=? AND location=? AND size=? AND modified=? AND identity=? AND changed=? AND EXISTS (SELECT 1 FROM sources WHERE id=? AND type='file' AND location=?)`, hash, sourceID, path, state.Size, state.Modified, state.Identity, state.Changed, sourceID, path)
			return err
		})
		if err != nil {
			log.Printf("interweave: fingerprint hash: %v", err)
		}
	})
}
func backfillFingerprints(ctx context.Context, db *storage.DB) {
	sources, err := (storage.SourceStore{}).ListFileSources(ctx, db.SqlDB())
	if err != nil {
		log.Printf("interweave: fingerprint backfill: %v", err)
		return
	}
	for _, src := range sources {
		if ctx.Err() != nil {
			return
		}
		if src.Available {
			recordFingerprint(db, src.ID, src.Location)
		}
	}
}
func getFingerprint(ctx context.Context, db *storage.DB, id string) (fileFingerprint, error) {
	var f fileFingerprint
	err := db.SqlDB().QueryRowContext(ctx, `SELECT size,modified,identity,changed,hash FROM source_fingerprints WHERE source_id=?`, id).Scan(&f.Size, &f.Modified, &f.Identity, &f.Changed, &f.Hash)
	if err == sql.ErrNoRows {
		return f, nil
	}
	if err != nil {
		return f, fmt.Errorf("read fingerprint: %w", err)
	}
	return f, nil
}
