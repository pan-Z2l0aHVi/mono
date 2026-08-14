package main

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
)

// IndexService 负责全量扫描：校验条目、补齐监听根内新文件、尝试唯一候选自动修复。
type IndexService struct {
	db      *sql.DB
	items   *ItemService
	repairs *RepairService
	emit    func(name string, data any)
}

func NewIndexService(db *sql.DB, items *ItemService, repairs *RepairService, emit func(name string, data any)) *IndexService {
	return &IndexService{db: db, items: items, repairs: repairs, emit: emit}
}

// Rescan 执行全量扫描并返回摘要。
func (s *IndexService) Rescan(ctx context.Context) (RescanResult, error) {
	var res RescanResult
	s.progress("scan", 0, 0)

	all, err := s.items.listAllItemsForWatcher(ctx)
	if err != nil {
		return res, err
	}
	total := len(all)
	for i, r := range all {
		s.progress("scan", i, total)
		if r.Kind != "file" {
			res.Verified++
			continue
		}
		fi, err := os.Stat(r.Locator)
		if err == nil && !fi.IsDir() {
			// 存在：刷新指纹
			if fi.Size() != r.Size || fi.ModTime().UnixMilli() != r.Mtime {
				r.Size = fi.Size()
				r.Mtime = fi.ModTime().UnixMilli()
				r.UpdatedAt = nowMillis()
			}
			r.Status = "ok"
			r.LastVerifiedAt = nowMillis()
			if err := updateItemRow(ctx, s.db, r); err != nil {
				return res, err
			}
			if err := s.repairs.repairIfRestored(ctx, r); err != nil {
				return res, err
			}
			res.Verified++
			continue
		}
		// 缺失：标记断链
		if err := s.repairs.markBroken(ctx, r); err != nil {
			return res, err
		}
		res.Broken++
	}

	// 断链条目先尝试唯一候选自动修复（让被移动/改名的文件被“收养”，避免后续重复入库）
	broken, err := listRepairJobs(ctx, s.db, "open")
	if err != nil {
		return res, err
	}
	for _, job := range broken {
		item, err := getItem(ctx, s.db, job.ItemID)
		if err != nil {
			return res, err
		}
		if item == nil {
			continue
		}
		ok, err := s.repairs.autoRepairItem(ctx, item)
		if err != nil {
			return res, err
		}
		if ok {
			res.Repaired++
		}
	}

	// 监听根内补齐真正的新文件（扁平索引；修复已认领的位置会被去重跳过）
	roots, err := listWatchRoots(ctx, s.db)
	if err != nil {
		return res, err
	}
	for _, root := range roots {
		_ = filepath.WalkDir(root.Path, func(p string, d os.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if isHidden(p) {
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
			if d.IsDir() {
				return nil
			}
			fi, err := d.Info()
			if err != nil || !fi.Mode().IsRegular() {
				return nil
			}
			existing, err := getItemByLocator(ctx, s.db, p)
			if err != nil {
				return err
			}
			if existing != nil {
				return nil
			}
			if _, err := s.items.AddFiles(ctx, []string{p}, nil); err != nil {
				return err
			}
			res.NewItems++
			return nil
		})
	}

	s.progress("done", total, total)
	if s.emit != nil {
		s.emit("weave:items-changed", map[string]string{"reason": "rescan"})
	}
	return res, nil
}

// GetStats 返回库统计信息。
func (s *IndexService) GetStats(ctx context.Context) (Stats, error) {
	var st Stats
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM items`).Scan(&st.ItemCount); err != nil {
		return st, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(size), 0) FROM items`).Scan(&st.TotalSize); err != nil {
		return st, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM items WHERE kind = 'file'`).Scan(&st.FileCount); err != nil {
		return st, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM items WHERE kind = 'url'`).Scan(&st.URLCount); err != nil {
		return st, err
	}
	broken, err := countBroken(ctx, s.db)
	if err != nil {
		return st, err
	}
	st.BrokenCount = broken
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM tags`).Scan(&st.TagCount); err != nil {
		return st, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM watch_roots`).Scan(&st.WatchRootCount); err != nil {
		return st, err
	}
	open, err := countOpenRepairs(ctx, s.db)
	if err != nil {
		return st, err
	}
	st.RepairOpenCount = open
	return st, nil
}

func (s *IndexService) progress(phase string, current, total int) {
	if s.emit != nil {
		s.emit("weave:index-progress", map[string]any{"phase": phase, "current": current, "total": total})
	}
}
