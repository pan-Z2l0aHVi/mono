package service

import (
	"context"
	"errors"
	"sync"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/id"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

type RecoveryCandidateDTO = core.RecoveryCandidate

type RecoveryScanUpdateDTO struct {
	Candidates       []RecoveryCandidateDTO `json:"candidates"`
	Checked          int                    `json:"checked"`
	CurrentDirectory string                 `json:"currentDirectory"`
	Skipped          int                    `json:"skipped"`
	Done             bool                   `json:"done"`
	Cancelled        bool                   `json:"cancelled"`
	Error            string                 `json:"error"`
}
type recoverySession struct {
	mu     sync.Mutex
	cancel context.CancelFunc
	update RecoveryScanUpdateDTO
}
type recoverySessions struct {
	wg        sync.WaitGroup
	mu        sync.Mutex
	currentID string
	sessions  map[string]*recoverySession
}

// StartRecoveryScan starts one cancellable scan; an empty directory requests local mounted disks.
func (s *SourceService) StartRecoveryScan(_ context.Context, sourceIDs []string, directory string) (string, error) {
	s.recovery.mu.Lock()
	defer s.recovery.mu.Unlock()
	if s.recovery.currentID != "" {
		active := s.recovery.sessions[s.recovery.currentID]
		active.mu.Lock()
		done := active.update.Done
		active.mu.Unlock()
		if !done {
			return "", errors.New("a recovery scan is already running")
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	scanID := id.NewID()
	session := &recoverySession{cancel: cancel, update: RecoveryScanUpdateDTO{Candidates: []RecoveryCandidateDTO{}}}
	if s.recovery.sessions == nil {
		s.recovery.sessions = map[string]*recoverySession{}
	}
	if s.recovery.currentID != "" {
		delete(s.recovery.sessions, s.recovery.currentID)
	}
	s.recovery.sessions[scanID] = session
	s.recovery.currentID = scanID
	s.recovery.wg.Add(1)
	go func() {
		defer s.recovery.wg.Done()
		err := s.core.ScanRecovery(ctx, sourceIDs, directory, func(p core.RecoveryProgress, c *core.RecoveryCandidate) {
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

// PollRecoveryScan returns and consumes candidates accumulated since the last poll.
func (s *SourceService) PollRecoveryScan(_ context.Context, scanID string) (*RecoveryScanUpdateDTO, error) {
	s.recovery.mu.Lock()
	session := s.recovery.sessions[scanID]
	s.recovery.mu.Unlock()
	if session == nil {
		return nil, errors.New("recovery scan not found")
	}
	session.mu.Lock()
	result := session.update
	session.update.Candidates = []RecoveryCandidateDTO{}
	session.mu.Unlock()
	if result.Done {
		s.recovery.mu.Lock()
		if s.recovery.sessions[scanID] == session {
			delete(s.recovery.sessions, scanID)
			if s.recovery.currentID == scanID {
				s.recovery.currentID = ""
			}
		}
		s.recovery.mu.Unlock()
	}
	return &result, nil
}

// CancelRecoveryScan requests cancellation; poll until done to consume the remaining results.
func (s *SourceService) CancelRecoveryScan(_ context.Context, scanID string) error {
	s.recovery.mu.Lock()
	session := s.recovery.sessions[scanID]
	s.recovery.mu.Unlock()
	if session == nil {
		return errors.New("recovery scan not found")
	}
	session.cancel()
	return nil
}

// ReplaceScannedFileSource verifies the scan snapshot before replacing the source.
func (s *SourceService) ReplaceScannedFileSource(ctx context.Context, sourceID, path, snapshot string) (*ResourceDTO, error) {
	src, err := s.core.ReplaceScannedFileSource(ctx, sourceID, path, snapshot)
	if err != nil {
		return nil, err
	}
	return s.resourceDTO(ctx, src.ResourceID)
}

// ServiceShutdown stops and joins scans before the database is closed.
func (s *SourceService) ServiceShutdown() error {
	s.recovery.mu.Lock()
	for _, session := range s.recovery.sessions {
		session.cancel()
	}
	s.recovery.mu.Unlock()
	s.recovery.wg.Wait()
	return nil
}

// DiscardRecoveryScan cancels and releases a scan when its dialog is closed.
func (s *SourceService) DiscardRecoveryScan(_ context.Context, scanID string) {
	s.recovery.mu.Lock()
	session := s.recovery.sessions[scanID]
	delete(s.recovery.sessions, scanID)
	if s.recovery.currentID == scanID {
		s.recovery.currentID = ""
	}
	s.recovery.mu.Unlock()
	if session != nil {
		session.cancel()
	}
}
