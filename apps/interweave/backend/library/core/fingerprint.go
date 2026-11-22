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
	"runtime"
	"sync"

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

func withHash(state fileFingerprint, hash string) fileFingerprint {
	state.Hash = hash
	return state
}

// 哈希读缓冲池：128KB 在 read() 系统调用次数与常驻内存之间取平衡。
// 恢复扫描（≤ 4 worker）与回填（≤ 2 worker）可并发，全池峰值约 6 × 128KB ≈ 768KB。
var hashBufs = sync.Pool{New: func() any { return make([]byte, 128*1024) }}

func hashFile(ctx context.Context, path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	buf := hashBufs.Get().([]byte)
	defer hashBufs.Put(buf)
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

// backfillBatchSize 是回填写回的攒批阈值：主控协程每攒满一批或收尾时，
// 通过单次事务批量写回，替代逐条 WithTx。
const backfillBatchSize = 32

// backfillTask 是一条通过预过滤、需要回填的文件 Source。
type backfillTask struct {
	sourceID  string
	location  string
	state     fileFingerprint
	hadRecord bool
	old       storage.FingerprintRecord
}

// backfillResult 是 worker 的回填产出：哈希成功带 hash；哈希失败（读错误或
// TOCTOU 失配）时 attrsOnly 为真，只回写预过滤 stat 的属性快照——与旧行为对齐，
// Record 即使哈希不成也会落属性，identity 匹配不能因为读失败而丢失。
type backfillResult struct {
	task      backfillTask
	hash      string
	attrsOnly bool
}

// Backfill 为库内已可用的文件 Source 补齐指纹，由装配层在启动时调度。
// 先用 7 列全量只读查询做预过滤：位置未变、属性一致且已有 hash 的文件直接跳过，
// 冷启动未变更时只有一次只读查询、零写事务；需要哈希的文件以低并发计算
// （不与首屏缩略图抢 I/O），主控协程攒满一批经单次事务条件 CAS 写回，
// 滞留批次不会覆盖前台 RefreshSource / Watcher 并发写入的新指纹。
// 哈希失败（读错误或 TOCTOU 失配）的文件仍回写属性快照（hash 留空），
// 与旧行为一致：identity 匹配不依赖 hash 成功。
// 返回前等待全部 worker 排空：Backfill 运行在 db.ScheduleBackground 的作业协程里，
// DB.Close 会先取消作业再关库，这里必须保证没有哈希读到一半的 worker 跨过关闭点。
func (r *FingerprintRecorder) Backfill(ctx context.Context) {
	sources, err := (storage.SourceStore{}).ListFileSources(ctx, r.db.SqlDB())
	if err != nil {
		log.Printf("interweave: fingerprint backfill: %v", err)
		return
	}
	existing, err := r.store.ListAll(ctx, r.db.SqlDB())
	if err != nil {
		log.Printf("interweave: fingerprint backfill: %v", err)
		return
	}
	byID := make(map[string]storage.FingerprintRecord, len(existing))
	for _, rec := range existing {
		byID[rec.SourceID] = rec
	}

	var tasks []backfillTask
	for _, src := range sources {
		if ctx.Err() != nil {
			return
		}
		if !src.Available {
			continue
		}
		info, err := os.Stat(src.Location)
		if ClassifyFileStat(err, info) != FileServable {
			continue
		}
		state := fingerprintInfo(src.Location, info)
		if rec, ok := byID[src.ID]; ok && rec.Location == src.Location && sameFileState(rec.State, state) && rec.State.Hash != "" {
			continue
		}
		task := backfillTask{sourceID: src.ID, location: src.Location, state: state}
		if rec, ok := byID[src.ID]; ok {
			task.hadRecord = true
			task.old = rec
		}
		tasks = append(tasks, task)
	}
	if len(tasks) == 0 {
		return
	}

	hashWorkers := min(2, max(1, runtime.GOMAXPROCS(0)/2))
	taskCh := make(chan backfillTask)
	resultCh := make(chan backfillResult)
	var workerWg sync.WaitGroup
	for range hashWorkers {
		workerWg.Add(1)
		go func() {
			defer workerWg.Done()
			for task := range taskCh {
				if ctx.Err() != nil {
					continue
				}
				hash, err := hashFile(ctx, task.location)
				if err != nil {
					if ctx.Err() != nil {
						continue // 取消中：整批写回都会被放弃，outcome 无所谓
					}
					log.Printf("interweave: fingerprint hash %s: %v", task.location, err)
					sendBackfillResult(ctx, resultCh, backfillResult{task: task, attrsOnly: true})
					continue
				}
				// 二次 stat 的 TOCTOU 校验与 hashIfStillCurrent 相同：
				// 读完文件后属性变化则放弃哈希，但属性快照仍然回写。
				after, statErr := os.Stat(task.location)
				if ClassifyFileStat(statErr, after) != FileServable || !sameFileState(task.state, fingerprintInfo(task.location, after)) {
					sendBackfillResult(ctx, resultCh, backfillResult{task: task, attrsOnly: true})
					continue
				}
				sendBackfillResult(ctx, resultCh, backfillResult{task: task, hash: hash})
			}
		}()
	}
	go func() {
		defer close(taskCh)
		for _, task := range tasks {
			select {
			case taskCh <- task:
			case <-ctx.Done():
				return
			}
		}
	}()
	go func() {
		workerWg.Wait()
		close(resultCh)
	}()

	batch := make([]storage.FingerprintBackfill, 0, backfillBatchSize)
	for res := range resultCh {
		state := res.task.state
		if !res.attrsOnly {
			state = withHash(state, res.hash)
		}
		batch = append(batch, storage.FingerprintBackfill{
			SourceID:  res.task.sourceID,
			Location:  res.task.location,
			State:     state,
			HadRecord: res.task.hadRecord,
			Old:       res.task.old,
		})
		if len(batch) >= backfillBatchSize {
			r.flushBackfill(ctx, batch)
			batch = batch[:0]
		}
	}
	r.flushBackfill(ctx, batch)
}

// sendBackfillResult 以 ctx 守卫发送单个回填结果；取消时静默丢弃。
func sendBackfillResult(ctx context.Context, resultCh chan<- backfillResult, res backfillResult) {
	select {
	case resultCh <- res:
	case <-ctx.Done():
	}
}

// flushBackfill 把一批回填结果经单次事务写回；取消中静默放弃，与哈希失败的处理一致。
func (r *FingerprintRecorder) flushBackfill(ctx context.Context, batch []storage.FingerprintBackfill) {
	if len(batch) == 0 || ctx.Err() != nil {
		return
	}
	err := r.db.WithTx(ctx, func(tx *sql.Tx) error {
		return r.store.WriteBackfill(ctx, tx, batch)
	})
	if err != nil {
		log.Printf("interweave: fingerprint backfill: %v", err)
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
