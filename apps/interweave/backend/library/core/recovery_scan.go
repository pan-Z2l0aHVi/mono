package core

import (
	"context"
	"errors"
	"sync"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/id"
)

// RecoveryScanUpdate 是一次 Poll 取走的增量：Candidates 是自上次 Poll 以来新增的候选，
// 其余字段是当前进度与终态。
type RecoveryScanUpdate struct {
	Candidates       []RecoveryCandidate
	Checked          int
	CurrentDirectory string
	Skipped          int
	Done             bool
	Cancelled        bool
	Error            string
}

// ScanFunc 是 runner 驱动的扫描实现；SourceService.ScanRecovery 即其生产实现。
type ScanFunc func(ctx context.Context, sourceIDs []string, directory string, onProgress func(RecoveryProgress, *RecoveryCandidate)) error

type recoverySession struct {
	mu     sync.Mutex
	cancel context.CancelFunc
	update RecoveryScanUpdate
}

// RecoveryScanRunner 拥有找回扫描的会话状态机：同一时刻只允许一个未完成扫描、
// Poll 消费即清（完成后会话随之删除）、Shutdown 取消并等待全部后台扫描退出。
// 扫描算法本身（ScanFunc）与会话生命周期互不感知。
type RecoveryScanRunner struct {
	scan ScanFunc

	wg        sync.WaitGroup
	mu        sync.Mutex
	closed    bool
	currentID string
	sessions  map[string]*recoverySession
}

func NewRecoveryScanRunner(scan ScanFunc) *RecoveryScanRunner {
	return &RecoveryScanRunner{scan: scan, sessions: map[string]*recoverySession{}}
}

// Start 启动一次可取消的扫描并返回扫描 id；已有未完成扫描或已 Shutdown 时拒绝。
// 上一个已完成但未被 Poll 消费的会话在此被驱逐。
func (r *RecoveryScanRunner) Start(sourceIDs []string, directory string) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return "", errors.New("recovery service is shut down")
	}
	if r.currentID != "" {
		active := r.sessions[r.currentID]
		active.mu.Lock()
		done := active.update.Done
		active.mu.Unlock()
		if !done {
			return "", errors.New("a recovery scan is already running")
		}
		delete(r.sessions, r.currentID)
	}

	ctx, cancel := context.WithCancel(context.Background())
	scanID := id.NewID()
	session := &recoverySession{cancel: cancel, update: RecoveryScanUpdate{Candidates: []RecoveryCandidate{}}}
	r.sessions[scanID] = session
	r.currentID = scanID

	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		err := r.scan(ctx, sourceIDs, directory, func(p RecoveryProgress, c *RecoveryCandidate) {
			session.mu.Lock()
			defer session.mu.Unlock()
			session.update.Checked = p.Checked
			session.update.CurrentDirectory = p.CurrentDirectory
			session.update.Skipped = p.Skipped
			if c != nil {
				session.update.Candidates = append(session.update.Candidates, *c)
			}
		})
		session.mu.Lock()
		defer session.mu.Unlock()
		session.update.Done = true
		session.update.Cancelled = errors.Is(err, context.Canceled)
		if err != nil && !session.update.Cancelled {
			session.update.Error = err.Error()
		}
		cancel()
	}()
	return scanID, nil
}

// Poll 返回并清空自上次 Poll 以来累积的候选；扫描完成后的那次 Poll 同时删除会话。
func (r *RecoveryScanRunner) Poll(scanID string) (RecoveryScanUpdate, error) {
	r.mu.Lock()
	session := r.sessions[scanID]
	r.mu.Unlock()
	if session == nil {
		return RecoveryScanUpdate{}, errors.New("recovery scan not found")
	}
	session.mu.Lock()
	result := session.update
	session.update.Candidates = []RecoveryCandidate{}
	session.mu.Unlock()
	if result.Done {
		r.mu.Lock()
		if r.sessions[scanID] == session {
			delete(r.sessions, scanID)
			if r.currentID == scanID {
				r.currentID = ""
			}
		}
		r.mu.Unlock()
	}
	return result, nil
}

// Cancel 请求取消；调用方继续 Poll 到 Done 以取走剩余结果。
func (r *RecoveryScanRunner) Cancel(scanID string) error {
	r.mu.Lock()
	session := r.sessions[scanID]
	r.mu.Unlock()
	if session == nil {
		return errors.New("recovery scan not found")
	}
	session.cancel()
	return nil
}

// Discard 取消并释放会话（对话框关闭时）；未知 id 为空操作。
func (r *RecoveryScanRunner) Discard(scanID string) {
	r.mu.Lock()
	session := r.sessions[scanID]
	delete(r.sessions, scanID)
	if r.currentID == scanID {
		r.currentID = ""
	}
	r.mu.Unlock()
	if session != nil {
		session.cancel()
	}
}

// Shutdown 拒绝后续 Start，取消全部会话并等待后台扫描退出，须先于数据库关闭。
func (r *RecoveryScanRunner) Shutdown() {
	r.mu.Lock()
	r.closed = true
	for _, session := range r.sessions {
		session.cancel()
	}
	r.mu.Unlock()
	r.wg.Wait()
}
