package core

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

type RecoveryCandidate struct {
	SourceID     string   `json:"sourceID"`
	Path         string   `json:"path"`
	Size         int64    `json:"size"`
	ModifiedAt   int64    `json:"modifiedAt"`
	MatchReasons []string `json:"matchReasons"`
	Snapshot     string   `json:"snapshot"`
}
type recoveryTarget struct {
	source      Source
	fingerprint fileFingerprint
}
type RecoveryProgress struct {
	Checked          int    `json:"checked"`
	CurrentDirectory string `json:"currentDirectory"`
	Skipped          int    `json:"skipped"`
}

func (s *SourceService) ScanRecovery(ctx context.Context, sourceIDs []string, directory string, report func(RecoveryProgress, *RecoveryCandidate)) error {
	targets := make([]recoveryTarget, 0, len(sourceIDs))
	seen := map[string]bool{}
	for _, id := range sourceIDs {
		if seen[id] {
			continue
		}
		seen[id] = true
		src, err := s.sources.Get(ctx, s.db.SqlDB(), id)
		if err != nil {
			return err
		}
		if src.Type != storage.SourceTypeFile || src.Available {
			continue
		}
		fp, err := getFingerprint(ctx, s.db, id)
		if err != nil {
			return err
		}
		targets = append(targets, recoveryTarget{src, fp})
	}
	if len(targets) == 0 {
		return nil
	}
	var roots []string
	excluded := map[string]bool{}
	if directory != "" {
		p, err := filepath.Abs(directory)
		if err != nil {
			return err
		}
		info, err := os.Stat(p)
		if err != nil {
			return err
		}
		if !info.IsDir() {
			return errors.New("scan directory is not a directory")
		}
		roots = []string{p}
	} else {
		var err error
		roots, excluded, err = localScanRoots()
		if err != nil {
			return err
		}
	}
	progress := RecoveryProgress{}
	visitedPaths := map[string]bool{}
	visitedFiles := map[string]bool{}
	matched := map[string]map[string]bool{}
	type cachedHash struct {
		state fileFingerprint
		hash  string
	}
	hashes := map[string]cachedHash{}
	for _, root := range roots {
		err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
			if err := ctx.Err(); err != nil {
				return err
			}
			if walkErr != nil {
				progress.Skipped++
				report(progress, nil)
				return nil
			}
			if entry.IsDir() {
				if path != root && excluded[filepath.Clean(path)] {
					progress.Skipped++
					report(progress, nil)
					return filepath.SkipDir
				}
				progress.CurrentDirectory = path
				report(progress, nil)
				return nil
			}
			if entry.Type()&os.ModeSymlink != 0 {
				return nil
			}
			info, err := entry.Info()
			if err != nil {
				progress.Skipped++
				return nil
			}
			if !info.Mode().IsRegular() {
				return nil
			}
			path = filepath.Clean(path)
			if visitedPaths[path] {
				return nil
			}
			visitedPaths[path] = true
			state := fingerprintInfo(path, info)
			fileKey := "path:" + path
			if state.Identity != "" {
				fileKey = fmt.Sprintf("identity:%s:%d:%d:%d", state.Identity, state.Size, state.Modified, state.Changed)
			}
			if !visitedFiles[fileKey] {
				progress.Checked++
				visitedFiles[fileKey] = true
			}
			name := filepath.Base(path)
			hashNeeded := false
			for _, t := range targets {
				if t.fingerprint.Hash != "" && t.fingerprint.Size == state.Size {
					hashNeeded = true
					break
				}
			}
			var hash string
			if hashNeeded {
				previous, cached := hashes[fileKey]
				if cached && sameFileState(previous.state, state) {
					hash = previous.hash
				} else {
					hash, err = hashFile(ctx, path)
					if err == nil {
						hashes[fileKey] = cachedHash{state: state, hash: hash}
					}
				}

				if err != nil {
					if ctx.Err() != nil {
						return ctx.Err()
					}
					progress.Skipped++
				}
			}
			after, err := os.Stat(path)
			if err != nil || !after.Mode().IsRegular() || !sameFileState(state, fingerprintInfo(path, after)) {
				report(progress, nil)
				return nil
			}
			b, _ := json.Marshal(state)
			snapshot := base64.RawURLEncoding.EncodeToString(b)
			for _, t := range targets {
				reasons := []string{}
				if state.Identity != "" && t.fingerprint.Identity != "" && state.Identity == t.fingerprint.Identity {
					reasons = append(reasons, "identity")
				}
				if hash != "" && hash == t.fingerprint.Hash {
					reasons = append(reasons, "hash")
				}
				if name == filepath.Base(t.source.Location) {
					reasons = append(reasons, "name")
				}
				if len(reasons) > 0 {
					if matched[t.source.ID] == nil {
						matched[t.source.ID] = map[string]bool{}
					}
					if matched[t.source.ID][fileKey] {
						continue
					}
					matched[t.source.ID][fileKey] = true
					c := RecoveryCandidate{SourceID: t.source.ID, Path: path, Size: state.Size, ModifiedAt: info.ModTime().UnixMilli(), MatchReasons: reasons, Snapshot: snapshot}
					report(progress, &c)
				}
			}
			report(progress, nil)
			return nil
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *SourceService) ReplaceScannedFileSource(ctx context.Context, sourceID, path, snapshot string) (Source, error) {
	raw, err := base64.RawURLEncoding.DecodeString(snapshot)
	if err != nil {
		return Source{}, fmt.Errorf("invalid scan snapshot: %w", err)
	}
	var before fileFingerprint
	if err = json.Unmarshal(raw, &before); err != nil {
		return Source{}, fmt.Errorf("invalid scan snapshot: %w", err)
	}
	info, err := os.Lstat(path)
	if err != nil {
		return Source{}, fmt.Errorf("candidate unavailable: %w", err)
	}
	if !info.Mode().IsRegular() || !sameFileState(before, fingerprintInfo(path, info)) {
		return Source{}, errors.New("candidate changed since scan")
	}
	src, err := s.getSource(ctx, sourceID)
	if err != nil {
		return Source{}, err
	}
	if src.Type != storage.SourceTypeFile || src.Available {
		return Source{}, errors.New("source is no longer an unavailable file")
	}
	return s.ReplaceFileSource(ctx, sourceID, path)
}

// cleanMountPath decodes mountinfo's escaped whitespace and backslashes.
func cleanMountPath(path string) string {
	r := strings.NewReplacer(`\040`, ` `, `\011`, `\t`, `\012`, `\n`, `\134`, `\`)
	return filepath.Clean(r.Replace(path))
}
