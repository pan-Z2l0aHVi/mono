package backend

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
)

// RepairService 处理断链的发现与修复（候选邻近优先：原目录 → 所属监听根 → 其他登记根）。
type RepairService struct {
	db   *sql.DB
	emit func(name string, data any)
}

func NewRepairService(db *sql.DB, emit func(name string, data any)) *RepairService {
	return &RepairService{db: db, emit: emit}
}

func (s *RepairService) queueChanged() {
	if s.emit != nil {
		s.emit("interweave:repair-queue-changed", map[string]string{})
	}
}

// ListRepairs 列出修复工作项；state 为空表示全部。
func (s *RepairService) ListRepairs(ctx context.Context, state string) ([]RepairItem, error) {
	repairs, err := listRepairJobs(ctx, s.db, state)
	if err != nil {
		return nil, err
	}
	return repairs, nil
}

// GetCandidates 为某个修复项计算候选位置（每次实时计算，不落库）。
func (s *RepairService) GetCandidates(ctx context.Context, repairID string) ([]Candidate, error) {
	jobs, err := listRepairJobs(ctx, s.db, "")
	if err != nil {
		return nil, err
	}
	var job *RepairItem
	for i := range jobs {
		if jobs[i].ID == repairID {
			job = &jobs[i]
			break
		}
	}
	if job == nil {
		return nil, fmt.Errorf("修复项不存在: %s", repairID)
	}
	item, err := getItem(ctx, s.db, job.ItemID)
	if err != nil {
		return nil, err
	}
	if item == nil || item.Kind != "file" {
		return nil, fmt.Errorf("条目不存在或不是文件: %s", job.ItemID)
	}
	candidates, err := s.findCandidates(ctx, item)
	if err != nil {
		return nil, err
	}
	return candidates, nil
}

// findCandidates 邻近优先搜索候选：原目录 → 所有监听根（含子目录）。
func (s *RepairService) findCandidates(ctx context.Context, item *itemRow) ([]Candidate, error) {
	dir := filepath.Dir(item.Locator)
	name := filepath.Base(item.Locator)
	out := make([]Candidate, 0)
	seen := map[string]bool{}

	add := func(path, note string, score int) {
		abs, err := filepath.Abs(path)
		if err != nil || seen[abs] {
			return
		}
		seen[abs] = true
		out = append(out, Candidate{Path: abs, Score: score, Note: note})
	}

	// 1) 原目录：同名文件优先
	if fi, err := os.Stat(dir); err == nil && fi.IsDir() {
		cand := filepath.Join(dir, name)
		if fi, err := os.Stat(cand); err == nil && !fi.IsDir() {
			score := 90
			note := "原目录同名文件"
			if fi.Size() == item.Size {
				score += 5
				note += "（大小一致）"
			}
			add(cand, note, score)
		}
	}

	// 2) 监听根内递归搜索（跳过隐藏路径）
	roots, err := listWatchRoots(ctx, s.db)
	if err != nil {
		return nil, err
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
			nameMatch := d.Name() == name
			sizeMatch := fi.Size() == item.Size
			if !nameMatch && !sizeMatch {
				return nil
			}
			score := 0
			note := ""
			if nameMatch {
				score += 80
				note = "监听根内同名文件"
			}
			if sizeMatch {
				if nameMatch {
					score += 15
					note += "（大小一致）"
				} else {
					score += 70
					note = "仅大小一致（可能已改名）"
				}
			}
			if abs(fi.ModTime().UnixMilli()-item.Mtime) <= 5000 {
				score += 5
				note += "（时间接近）"
			}
			add(p, note, score)
			return nil
		})
	}
	return out, nil
}

func abs(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}

// AutoRepair 唯一强匹配候选时自动修复；否则返回 false。
func (s *RepairService) AutoRepair(ctx context.Context, repairID string) (bool, error) {
	cands, err := s.GetCandidates(ctx, repairID)
	if err != nil {
		return false, err
	}
	var strong []Candidate
	for _, c := range cands {
		if c.Score >= 95 {
			strong = append(strong, c)
		}
	}
	if len(strong) != 1 {
		return false, nil
	}
	if err := s.applyRepair(ctx, repairID, strong[0].Path, "auto_fixed"); err != nil {
		return false, err
	}
	return true, nil
}

// Repair 手动把条目重定位到 targetPath。
func (s *RepairService) Repair(ctx context.Context, repairID string, targetPath string) error {
	abs, err := filepath.Abs(targetPath)
	if err != nil {
		return err
	}
	fi, err := os.Stat(abs)
	if err != nil || fi.IsDir() {
		return fmt.Errorf("目标不存在或不是文件: %s", abs)
	}
	return s.applyRepair(ctx, repairID, abs, "manual_fixed")
}

func (s *RepairService) applyRepair(ctx context.Context, repairID, targetPath, state string) error {
	jobs, err := listRepairJobs(ctx, s.db, "")
	if err != nil {
		return err
	}
	var job *RepairItem
	for i := range jobs {
		if jobs[i].ID == repairID {
			job = &jobs[i]
			break
		}
	}
	if job == nil {
		return fmt.Errorf("修复项不存在: %s", repairID)
	}
	item, err := getItem(ctx, s.db, job.ItemID)
	if err != nil {
		return err
	}
	if item == nil {
		return fmt.Errorf("条目不存在: %s", job.ItemID)
	}
	// 目标位置若已被“补齐索引”创建的重复条目占用，则收养该位置（删除重复项，保留原条目身份与标签）
	if dup, err := getItemByLocator(ctx, s.db, targetPath); err != nil {
		return err
	} else if dup != nil && dup.ID != item.ID {
		if err := deleteItems(ctx, s.db, []string{dup.ID}); err != nil {
			return err
		}
	}
	item.Locator = targetPath
	item.Name = filepath.Base(targetPath)
	item.Status = "ok"
	item.UpdatedAt = nowMillis()
	item.LastVerifiedAt = nowMillis()
	if fi, err := os.Stat(targetPath); err == nil {
		item.Size = fi.Size()
		item.Mtime = fi.ModTime().UnixMilli()
	}
	if item.Mime == "" {
		item.Mime = detectMime(targetPath)
	}
	if err := updateItemRow(ctx, s.db, item); err != nil {
		return err
	}
	if err := closeRepairJob(ctx, s.db, job.ItemID, state); err != nil {
		return err
	}
	s.queueChanged()
	if s.emit != nil {
		s.emit("interweave:items-changed", map[string]string{"reason": "repair"})
	}
	return nil
}

// Dismiss 忽略某个修复项。
func (s *RepairService) Dismiss(ctx context.Context, repairID string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE repair_jobs SET state = 'dismissed', updated_at = ? WHERE id = ? AND state = 'open'`, nowMillis(), repairID)
	if err != nil {
		return err
	}
	s.queueChanged()
	return nil
}

// markBroken 标记条目断链并打开修复项（watcher/rescan 共用）。
func (s *RepairService) markBroken(ctx context.Context, item *itemRow) error {
	if item.Status == "broken" {
		return nil
	}
	item.Status = "broken"
	item.UpdatedAt = nowMillis()
	if err := updateItemRow(ctx, s.db, item); err != nil {
		return err
	}
	if _, err := openRepairJob(ctx, s.db, item.ID); err != nil {
		return err
	}
	s.queueChanged()
	return nil
}

// repairIfRestored 源文件重新出现时恢复条目并关闭修复项。
func (s *RepairService) repairIfRestored(ctx context.Context, item *itemRow) error {
	fi, err := os.Stat(item.Locator)
	if err != nil || fi.IsDir() {
		return nil
	}
	if item.Status == "broken" {
		item.Status = "ok"
		item.UpdatedAt = nowMillis()
		item.LastVerifiedAt = nowMillis()
		item.Size = fi.Size()
		item.Mtime = fi.ModTime().UnixMilli()
		if err := updateItemRow(ctx, s.db, item); err != nil {
			return err
		}
		if err := closeRepairJob(ctx, s.db, item.ID, "auto_fixed"); err != nil {
			return err
		}
		s.queueChanged()
	}
	return nil
}

// autoRepairItem 对单个断链条目尝试唯一强匹配自动修复。
func (s *RepairService) autoRepairItem(ctx context.Context, item *itemRow) (bool, error) {
	job, err := getOpenRepairByItem(ctx, s.db, item.ID)
	if err != nil {
		return false, err
	}
	if job == nil {
		return false, nil
	}
	cands, err := s.findCandidates(ctx, item)
	if err != nil {
		return false, err
	}
	var strong []Candidate
	for _, c := range cands {
		if c.Score >= 95 {
			strong = append(strong, c)
		}
	}
	if len(strong) != 1 {
		return false, nil
	}
	if err := s.applyRepair(ctx, job.ID, strong[0].Path, "auto_fixed"); err != nil {
		return false, err
	}
	return true, nil
}

// markAllBrokenForPath 把 locator 指向 path（或其下）的条目标记断链。
func (s *RepairService) markAllBrokenForPath(ctx context.Context, path string) error {
	rows, err := s.db.QueryContext(ctx, `SELECT `+itemColumns+` FROM items WHERE kind = 'file' AND (locator = ? OR locator LIKE ?)`,
		path, path+string(filepath.Separator)+"%")
	if err != nil {
		return err
	}
	defer rows.Close()
	var items []*itemRow
	for rows.Next() {
		r, err := scanItem(rows)
		if err != nil {
			return err
		}
		items = append(items, r)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, it := range items {
		if err := s.markBroken(ctx, it); err != nil {
			return err
		}
	}
	return nil
}

// ---- repair jobs CRUD ----

func getOpenRepairByItem(ctx context.Context, db *sql.DB, itemID string) (*RepairItem, error) {
	row := db.QueryRowContext(ctx, `SELECT id, item_id, state, created_at, updated_at FROM repair_jobs WHERE item_id = ? AND state = 'open'`, itemID)
	var r RepairItem
	if err := row.Scan(&r.ID, &r.ItemID, &r.State, &r.CreatedAt, &r.UpdatedAt); err == sql.ErrNoRows {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	return &r, nil
}

func openRepairJob(ctx context.Context, db *sql.DB, itemID string) (*RepairItem, error) {
	existing, err := getOpenRepairByItem(ctx, db, itemID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	r := &RepairItem{ID: newID(), ItemID: itemID, State: "open", CreatedAt: nowMillis(), UpdatedAt: nowMillis()}
	_, err = db.ExecContext(ctx, `INSERT INTO repair_jobs(id, item_id, state, created_at, updated_at) VALUES (?,?,?,?,?)`,
		r.ID, r.ItemID, r.State, r.CreatedAt, r.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return r, nil
}

func closeRepairJob(ctx context.Context, db *sql.DB, itemID, state string) error {
	_, err := db.ExecContext(ctx, `UPDATE repair_jobs SET state = ?, updated_at = ? WHERE item_id = ? AND state = 'open'`, state, nowMillis(), itemID)
	return err
}

func listRepairJobs(ctx context.Context, db *sql.DB, state string) ([]RepairItem, error) {
	query := `SELECT r.id, r.item_id, r.state, r.created_at, r.updated_at, i.name, i.locator FROM repair_jobs r JOIN items i ON i.id = r.item_id`
	var args []any
	if state != "" {
		query += ` WHERE r.state = ?`
		args = append(args, state)
	}
	query += ` ORDER BY r.updated_at DESC`
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]RepairItem, 0)
	for rows.Next() {
		r := RepairItem{Candidates: []string{}}
		if err := rows.Scan(&r.ID, &r.ItemID, &r.State, &r.CreatedAt, &r.UpdatedAt, &r.ItemName, &r.ItemPath); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func countOpenRepairs(ctx context.Context, db *sql.DB) (int, error) {
	var n int
	err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM repair_jobs WHERE state = 'open'`).Scan(&n)
	return n, err
}
