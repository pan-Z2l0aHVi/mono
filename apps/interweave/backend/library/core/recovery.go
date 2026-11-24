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
	"runtime"
	"strings"
	"sync"
	"time"

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

func (s *Library) ScanRecovery(ctx context.Context, sourceIDs []string, directory string, report func(RecoveryProgress, *RecoveryCandidate)) error {
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
		fp, err := s.ingest.fingerprints.Get(ctx, id)
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
	// 预索引：按 size/identity/hash/name 各建一次倒排，热循环里只查命中目标，
	// 不再对每个文件线性扫全部 targets。
	sizeNeedHash := map[int64]bool{}
	byIdentity := map[string][]int{}
	byHash := map[string][]int{}
	byName := map[string][]int{}
	for i, t := range targets {
		if t.fingerprint.Hash != "" {
			sizeNeedHash[t.fingerprint.Size] = true
			byHash[t.fingerprint.Hash] = append(byHash[t.fingerprint.Hash], i)
		}
		if t.fingerprint.Identity != "" {
			byIdentity[t.fingerprint.Identity] = append(byIdentity[t.fingerprint.Identity], i)
		}
		byName[filepath.Base(t.source.Location)] = append(byName[filepath.Base(t.source.Location)], i)
	}

	hashWorkers := max(1, min(runtime.GOMAXPROCS(0), 4))
	hashCh := make(chan scanItem, hashWorkers*2)
	resCh := make(chan scanResult, hashWorkers*2)
	var workerWg sync.WaitGroup
	for range hashWorkers {
		workerWg.Add(1)
		go runScanHashWorker(ctx, hashCh, resCh, &workerWg)
	}
	agg := newScanAggregator(ctx, targets, byIdentity, byHash, byName, report)
	aggDone := make(chan struct{})
	go func() {
		defer close(aggDone)
		agg.consume(resCh)
	}()

	visitedPaths := map[string]bool{}
	hashQueued := map[string]bool{}
	sendResult := func(res scanResult) error {
		select {
		case resCh <- res:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	var scanErr error
	for _, root := range roots {
		err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
			if err := ctx.Err(); err != nil {
				return err
			}
			if walkErr != nil {
				return sendResult(scanResult{kind: scanResultSkip})
			}
			if entry.IsDir() {
				if path != root && excluded[filepath.Clean(path)] {
					if err := sendResult(scanResult{kind: scanResultSkip}); err != nil {
						return err
					}
					return filepath.SkipDir
				}
				return sendResult(scanResult{kind: scanResultDir, dirPath: path})
			}
			if entry.Type()&os.ModeSymlink != 0 {
				return nil
			}
			info, err := entry.Info()
			if err != nil {
				return sendResult(scanResult{kind: scanResultSkip})
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
			item := scanItem{path: path, name: filepath.Base(path), modMs: info.ModTime().UnixMilli(), state: state, fileKey: fileKey}
			if !sizeNeedHash[state.Size] {
				return sendResult(scanResult{kind: scanResultItem, item: item})
			}
			// 同一 fileKey 只把首个路径送进哈希流水线；硬链接别名绝不丢弃，
			// 标记 awaitHash 进结果通道，由聚合器等主哈希 outcome 后合并裁决。
			if hashQueued[fileKey] {
				item.awaitHash = true
				return sendResult(scanResult{kind: scanResultItem, item: item})
			}
			hashQueued[fileKey] = true
			select {
			case hashCh <- item:
				return nil
			case <-ctx.Done():
				return ctx.Err()
			}
		})
		if err != nil {
			scanErr = err
			break
		}
	}
	// 排空严格有序：WalkDir 返回 → close(hashCh) → 等 worker 退完 → close(resCh) → 等聚合器退出，
	// 之后才返回；所有通道发送都以 ctx.Done 守卫，取消时不会有人卡死。
	close(hashCh)
	workerWg.Wait()
	close(resCh)
	<-aggDone
	if scanErr != nil {
		return scanErr
	}
	return ctx.Err()
}

// scanItem 是遍历生产的一个待评估文件；awaitHash 表示它要等同一 fileKey 的主哈希结果。
type scanItem struct {
	path      string
	name      string
	modMs     int64
	state     fileFingerprint
	fileKey   string
	awaitHash bool
}

// hashOutcome 是 worker 对一个主哈希任务的裁决：成功、读失败或 TOCTOU 失败都必须各回传一条，
// 等待中的别名才有确定的结局，不会悬空。
type hashOutcome struct {
	item    scanItem
	hash    string
	readErr error
	statOK  bool
}

type scanResultKind int

const (
	scanResultDir scanResultKind = iota
	scanResultSkip
	scanResultItem
	scanResultOutcome
)

type scanResult struct {
	kind    scanResultKind
	dirPath string
	item    scanItem
	outcome hashOutcome
}

// runScanHashWorker 消费主哈希任务：算完立刻在 worker 内做二次 stat 的 TOCTOU 校验
// （沿用原先主循环 :162-166 的语义），结果打包成 outcome 回传给聚合器。
func runScanHashWorker(ctx context.Context, hashCh <-chan scanItem, resCh chan<- scanResult, wg *sync.WaitGroup) {
	defer wg.Done()
	for item := range hashCh {
		if ctx.Err() != nil {
			continue // 扫描已在取消中：快速排空队列即可，outcome 无人需要
		}
		hash, hashErr := hashFile(ctx, item.path)
		if hashErr != nil && ctx.Err() != nil {
			continue
		}
		after, statErr := os.Stat(item.path)
		statOK := statErr == nil && after.Mode().IsRegular() && sameFileState(item.state, fingerprintInfo(item.path, after))
		select {
		case resCh <- scanResult{kind: scanResultOutcome, outcome: hashOutcome{item: item, hash: hash, readErr: hashErr, statOK: statOK}}:
		case <-ctx.Done():
			return
		}
	}
}

// 进度节流：首条必报（取消语义依赖首个回调立刻到达），此后按事件数或时间窗收敛回调量，
// 终态再补报一次保证最终进度一定送达。
const (
	recoveryReportThrottle = 128
	recoveryReportInterval = 50 * time.Millisecond
)

type recoveryHit struct {
	target  *recoveryTarget
	reasons []string
}

// scanAggregator 是唯一的扫描状态拥有者：progress、visitedFiles、matched、候选与全部
// report() 调用都收敛在这一个 goroutine，回调方无需任何同步。
type scanAggregator struct {
	ctx        context.Context
	targets    []recoveryTarget
	byIdentity map[string][]int
	byHash     map[string][]int
	byName     map[string][]int

	progress     RecoveryProgress
	visitedFiles map[string]bool
	matched      map[string]map[string]bool
	resolved     map[string]hashOutcome
	pending      map[string][]scanItem

	lastReport time.Time
	sinceLast  int
	report     func(RecoveryProgress, *RecoveryCandidate)
}

func newScanAggregator(ctx context.Context, targets []recoveryTarget, byIdentity, byHash, byName map[string][]int, report func(RecoveryProgress, *RecoveryCandidate)) *scanAggregator {
	return &scanAggregator{
		ctx: ctx, targets: targets, byIdentity: byIdentity, byHash: byHash, byName: byName,
		visitedFiles: map[string]bool{},
		matched:      map[string]map[string]bool{},
		resolved:     map[string]hashOutcome{},
		pending:      map[string][]scanItem{},
		report:       report,
	}
}

func (a *scanAggregator) consume(resCh <-chan scanResult) {
	for res := range resCh {
		if a.ctx.Err() != nil {
			continue // 取消后只排空通道，不再改状态或回调
		}
		switch res.kind {
		case scanResultDir:
			a.progress.CurrentDirectory = res.dirPath
			a.reportEvent()
		case scanResultSkip:
			a.progress.Skipped++
			a.reportEvent()
		case scanResultItem:
			a.visit(res.item)
			if res.item.awaitHash {
				a.resolveAlias(res.item)
			} else {
				a.evaluate(res.item, "")
			}
		case scanResultOutcome:
			a.visit(res.outcome.item)
			if res.outcome.readErr != nil {
				a.progress.Skipped++
			}
			a.resolved[res.outcome.item.fileKey] = res.outcome
			a.evaluatePrechecked(res.outcome.item, res.outcome.hash, res.outcome.statOK)
			for _, alias := range a.pending[res.outcome.item.fileKey] {
				a.resolveAliasWith(alias, res.outcome)
			}
			delete(a.pending, res.outcome.item.fileKey)
		}
	}
	a.doReport(nil) // 终态补报
}

func (a *scanAggregator) visit(item scanItem) {
	if !a.visitedFiles[item.fileKey] {
		a.visitedFiles[item.fileKey] = true
		a.progress.Checked++
	}
}

// resolveAlias 处理 awaitHash 别名：主哈希已裁决就立刻评估，否则暂存等待 flush。
func (a *scanAggregator) resolveAlias(item scanItem) {
	if outcome, ok := a.resolved[item.fileKey]; ok {
		a.resolveAliasWith(item, outcome)
		return
	}
	a.pending[item.fileKey] = append(a.pending[item.fileKey], item)
}

// resolveAliasWith 用主哈希 outcome 评估别名：主条目成功才借它的 hash，
// 读失败或 TOCTOU 失败则只靠 identity/name 裁决，别名自己的延迟 TOCTOU stat 仍然把关。
func (a *scanAggregator) resolveAliasWith(item scanItem, outcome hashOutcome) {
	hash := ""
	if outcome.readErr == nil && outcome.statOK {
		hash = outcome.hash
	}
	a.evaluate(item, hash)
}

// evaluate 用给定 hash 对单个文件做完整裁决：identity/hash/name 命中后，先补上延迟的
// TOCTOU 二次 stat（只有命中才付这个 syscall），通过才写 matched 并产出候选。
func (a *scanAggregator) evaluate(item scanItem, hash string) {
	hits := a.collectReasons(item, hash)
	if len(hits) == 0 {
		a.reportEvent()
		return
	}
	after, err := os.Stat(item.path)
	if err != nil || !after.Mode().IsRegular() || !sameFileState(item.state, fingerprintInfo(item.path, after)) {
		a.reportEvent()
		return
	}
	a.emit(item, hits)
}

// evaluatePrechecked 的 TOCTOU 二次 stat 已由 worker 完成；失败即整条文件出局，
// 与原先「二次 stat 不通过就不产候选」的语义一致。
func (a *scanAggregator) evaluatePrechecked(item scanItem, hash string, statOK bool) {
	if !statOK {
		a.reportEvent()
		return
	}
	hits := a.collectReasons(item, hash)
	if len(hits) == 0 {
		a.reportEvent()
		return
	}
	a.emit(item, hits)
}

// collectReasons 以预索引倒排查 identity/hash/name 三路命中；单目标命中多路时
// 合并为一条候选，reasons 顺序保持 identity → hash → name。
func (a *scanAggregator) collectReasons(item scanItem, hash string) []recoveryHit {
	var hits []recoveryHit
	pos := map[int]int{}
	add := func(i int, reason string) {
		if p, ok := pos[i]; ok {
			hits[p].reasons = append(hits[p].reasons, reason)
			return
		}
		pos[i] = len(hits)
		hits = append(hits, recoveryHit{target: &a.targets[i], reasons: []string{reason}})
	}
	if item.state.Identity != "" {
		for _, i := range a.byIdentity[item.state.Identity] {
			add(i, "identity")
		}
	}
	if hash != "" {
		for _, i := range a.byHash[hash] {
			add(i, "hash")
		}
	}
	for _, i := range a.byName[item.name] {
		add(i, "name")
	}
	return hits
}

func (a *scanAggregator) emit(item scanItem, hits []recoveryHit) {
	// 延迟快照编码：只对命中文件做 json.Marshal + base64，非命中文件零开销。
	b, _ := json.Marshal(item.state)
	snapshot := base64.RawURLEncoding.EncodeToString(b)
	for _, hit := range hits {
		m := a.matched[hit.target.source.ID]
		if m == nil {
			m = map[string]bool{}
			a.matched[hit.target.source.ID] = m
		}
		if m[item.fileKey] {
			continue
		}
		m[item.fileKey] = true
		c := RecoveryCandidate{SourceID: hit.target.source.ID, Path: item.path, Size: item.state.Size, ModifiedAt: item.modMs, MatchReasons: hit.reasons, Snapshot: snapshot}
		a.doReport(&c)
	}
	a.reportEvent()
}

func (a *scanAggregator) reportEvent() {
	a.sinceLast++
	if a.lastReport.IsZero() || a.sinceLast >= recoveryReportThrottle || time.Since(a.lastReport) >= recoveryReportInterval {
		a.doReport(nil)
	}
}

func (a *scanAggregator) doReport(c *RecoveryCandidate) {
	a.lastReport = time.Now()
	a.sinceLast = 0
	a.report(a.progress, c)
}

func (s *Library) ReplaceScannedFileSource(ctx context.Context, sourceID, path, snapshot string) (Source, error) {
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
	return s.ReplaceSource(ctx, sourceID, path)
}

// cleanMountPath decodes mountinfo's escaped whitespace and backslashes.
func cleanMountPath(path string) string {
	r := strings.NewReplacer(`\040`, ` `, `\011`, `\t`, `\012`, `\n`, `\134`, `\`)
	return filepath.Clean(r.Replace(path))
}
