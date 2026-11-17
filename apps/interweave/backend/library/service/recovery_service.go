package service

import (
	"context"

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

func recoveryScanUpdateToDTO(u core.RecoveryScanUpdate) *RecoveryScanUpdateDTO {
	return &RecoveryScanUpdateDTO{
		Candidates:       u.Candidates,
		Checked:          u.Checked,
		CurrentDirectory: u.CurrentDirectory,
		Skipped:          u.Skipped,
		Done:             u.Done,
		Cancelled:        u.Cancelled,
		Error:            u.Error,
	}
}

// StartRecoveryScan starts one cancellable scan; an empty directory requests local mounted disks.
func (s *SourceService) StartRecoveryScan(_ context.Context, sourceIDs []string, directory string) (string, error) {
	return s.core.RecoveryScans().Start(sourceIDs, directory)
}

// PollRecoveryScan returns and consumes candidates accumulated since the last poll.
func (s *SourceService) PollRecoveryScan(_ context.Context, scanID string) (*RecoveryScanUpdateDTO, error) {
	update, err := s.core.RecoveryScans().Poll(scanID)
	if err != nil {
		return nil, err
	}
	return recoveryScanUpdateToDTO(update), nil
}

// CancelRecoveryScan requests cancellation; poll until done to consume the remaining results.
func (s *SourceService) CancelRecoveryScan(_ context.Context, scanID string) error {
	return s.core.RecoveryScans().Cancel(scanID)
}

// DiscardRecoveryScan cancels and releases a scan when its dialog is closed.
func (s *SourceService) DiscardRecoveryScan(_ context.Context, scanID string) {
	s.core.RecoveryScans().Discard(scanID)
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
	s.core.RecoveryScans().Shutdown()
	return nil
}
