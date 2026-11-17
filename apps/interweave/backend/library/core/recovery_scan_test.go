package core

import (
	"context"
	"errors"
	"testing"
	"time"
)

// blockingScan 返回一个可由测试放行的假扫描：先上报一个候选，再等放行或取消。
func blockingScan(release <-chan struct{}, result error) ScanFunc {
	return func(ctx context.Context, _ []string, _ string, onProgress func(RecoveryProgress, *RecoveryCandidate)) error {
		onProgress(RecoveryProgress{Checked: 1, CurrentDirectory: "/d"}, &RecoveryCandidate{Path: "/d/a"})
		select {
		case <-release:
			return result
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

func pollUntilDone(t *testing.T, r *RecoveryScanRunner, id string) RecoveryScanUpdate {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		update, err := r.Poll(id)
		if err != nil {
			t.Fatalf("Poll error: %v", err)
		}
		if update.Done {
			return update
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("scan did not finish")
	return RecoveryScanUpdate{}
}

func TestRecoveryRunnerRejectsSecondStartWhileRunning(t *testing.T) {
	release := make(chan struct{})
	r := NewRecoveryScanRunner(blockingScan(release, nil))
	t.Cleanup(r.Shutdown)

	if _, err := r.Start(nil, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := r.Start(nil, ""); err == nil || err.Error() != "a recovery scan is already running" {
		t.Fatalf("expected single-flight rejection, got %v", err)
	}
	close(release)
}

func TestRecoveryRunnerPollConsumesCandidatesAndDeletesWhenDone(t *testing.T) {
	release := make(chan struct{})
	r := NewRecoveryScanRunner(blockingScan(release, nil))
	t.Cleanup(r.Shutdown)
	id, err := r.Start(nil, "")
	if err != nil {
		t.Fatal(err)
	}

	var first RecoveryScanUpdate
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) && len(first.Candidates) == 0 {
		first, _ = r.Poll(id)
		time.Sleep(5 * time.Millisecond)
	}
	if len(first.Candidates) != 1 || first.Checked != 1 {
		t.Fatalf("expected the reported candidate, got %+v", first)
	}
	if again, _ := r.Poll(id); len(again.Candidates) != 0 {
		t.Fatalf("candidates must be consumed by poll, got %+v", again)
	}

	close(release)
	done := pollUntilDone(t, r, id)
	if done.Cancelled || done.Error != "" {
		t.Fatalf("unexpected terminal state %+v", done)
	}
	if _, err := r.Poll(id); err == nil {
		t.Fatal("session must be deleted after the done poll")
	}
	// 完成并消费后允许新扫描。
	if _, err := r.Start(nil, ""); err != nil {
		t.Fatalf("expected new scan after completion, got %v", err)
	}
}

func TestRecoveryRunnerCancelThenPollReportsCancelled(t *testing.T) {
	r := NewRecoveryScanRunner(blockingScan(make(chan struct{}), nil))
	t.Cleanup(r.Shutdown)
	id, _ := r.Start(nil, "")

	if err := r.Cancel(id); err != nil {
		t.Fatal(err)
	}
	done := pollUntilDone(t, r, id)
	if !done.Cancelled || done.Error != "" {
		t.Fatalf("expected cancelled without error, got %+v", done)
	}
}

func TestRecoveryRunnerReportsScanError(t *testing.T) {
	release := make(chan struct{})
	r := NewRecoveryScanRunner(blockingScan(release, errors.New("boom")))
	t.Cleanup(r.Shutdown)
	id, _ := r.Start(nil, "")
	close(release)

	done := pollUntilDone(t, r, id)
	if done.Error != "boom" || done.Cancelled {
		t.Fatalf("expected error state, got %+v", done)
	}
}

func TestRecoveryRunnerDiscardReleasesSessionAndCancels(t *testing.T) {
	r := NewRecoveryScanRunner(blockingScan(make(chan struct{}), nil))
	t.Cleanup(r.Shutdown)
	id, _ := r.Start(nil, "")

	r.Discard(id)
	if _, err := r.Poll(id); err == nil {
		t.Fatal("discarded session must not be pollable")
	}
	r.Discard("unknown") // 未知 id 是空操作
	// 丢弃的扫描被取消并让出 gate；等后台退出后可以立刻重新开始。
	deadline := time.Now().Add(3 * time.Second)
	for {
		if _, err := r.Start(nil, ""); err == nil {
			return
		}
		if time.Now().After(deadline) {
			t.Fatal("expected start to succeed after discard")
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func TestRecoveryRunnerShutdownCancelsJoinsAndRejectsStart(t *testing.T) {
	r := NewRecoveryScanRunner(blockingScan(make(chan struct{}), nil))
	if _, err := r.Start(nil, ""); err != nil {
		t.Fatal(err)
	}

	finished := make(chan struct{})
	go func() { r.Shutdown(); close(finished) }()
	select {
	case <-finished:
	case <-time.After(3 * time.Second):
		t.Fatal("Shutdown must cancel and join the running scan")
	}
	if _, err := r.Start(nil, ""); err == nil || err.Error() != "recovery service is shut down" {
		t.Fatalf("expected shutdown rejection, got %v", err)
	}
}

func TestRecoveryRunnerUnknownIDErrors(t *testing.T) {
	r := NewRecoveryScanRunner(blockingScan(nil, nil))
	if _, err := r.Poll("nope"); err == nil {
		t.Fatal("expected poll error")
	}
	if err := r.Cancel("nope"); err == nil {
		t.Fatal("expected cancel error")
	}
}
