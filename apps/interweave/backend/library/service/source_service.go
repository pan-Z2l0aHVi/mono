package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/id"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 维护 Resource 的外部入口，同时保证 Resource 始终可被保留。
type SourceService struct {
	db      *storage.DB
	fetcher *remote.Fetcher
	sources storage.SourceStore
}

// 保持 Source 规则与持久化实现解耦。
func NewSourceService(db *storage.DB, fetcher *remote.Fetcher) *SourceService {
	return &SourceService{
		db:      db,
		fetcher: fetcher,
		sources: storage.SourceStore{},
	}
}

// 补充备用入口不应意外改变用户当前的首选入口。
func (s *SourceService) AddFileSource(ctx context.Context, resourceID string, inputPath string) (*SourceDTO, error) {
	cleanPath, err := normalize.FilePath(inputPath)
	if err != nil {
		return nil, fmt.Errorf("invalid file path: %w", err)
	}

	available := false
	if _, err := os.Stat(cleanPath); err == nil {
		available = true
	}

	now := time.Now().UnixMilli()
	sourceID := id.NewID()

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		maxOrder, err := s.sources.MaxOrder(ctx, tx, resourceID)
		if err != nil {
			return err
		}
		src := storage.SourceModel{
			ID:          sourceID,
			ResourceID:  resourceID,
			Type:        storage.SourceTypeFile,
			Location:    cleanPath,
			Available:   available,
			IsPreferred: false,
			OrderIndex:  maxOrder + 1,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		return s.sources.Insert(ctx, tx, src)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to add file source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 补充 URL 入口不应覆盖用户已维护的资源语义。
func (s *SourceService) AddURLSource(ctx context.Context, resourceID string, inputURL string) (*SourceDTO, error) {
	normURL, err := normalize.URL(inputURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	meta, available, _ := s.fetcher.FetchURL(fetchCtx, normURL)

	metadataJSON := ""
	if meta != nil {
		bytes, err := json.Marshal(meta)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	now := time.Now().UnixMilli()
	sourceID := id.NewID()

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		maxOrder, err := s.sources.MaxOrder(ctx, tx, resourceID)
		if err != nil {
			return err
		}
		src := storage.SourceModel{
			ID:           sourceID,
			ResourceID:   resourceID,
			Type:         storage.SourceTypeURL,
			Location:     normURL,
			Available:    available,
			IsPreferred:  false,
			OrderIndex:   maxOrder + 1,
			MetadataJSON: metadataJSON,
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		return s.sources.Insert(ctx, tx, src)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to add URL source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 替换入口时保留其在 Resource 中的角色与顺位。
func (s *SourceService) ReplaceFileSource(ctx context.Context, sourceID string, inputPath string) (*SourceDTO, error) {
	cleanPath, err := normalize.FilePath(inputPath)
	if err != nil {
		return nil, fmt.Errorf("invalid file path: %w", err)
	}

	available := false
	if _, err := os.Stat(cleanPath); err == nil {
		available = true
	}

	now := time.Now().UnixMilli()
	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		err := s.sources.Replace(ctx, tx, sourceID, storage.SourceTypeFile, cleanPath, available, "", now)
		if errors.Is(err, storage.ErrSourceNotFound) {
			return errors.New("source not found")
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("failed to replace source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 替换入口时保留其在 Resource 中的角色与顺位。
func (s *SourceService) ReplaceURLSource(ctx context.Context, sourceID string, inputURL string) (*SourceDTO, error) {
	normURL, err := normalize.URL(inputURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	meta, available, _ := s.fetcher.FetchURL(fetchCtx, normURL)
	metadataJSON := ""
	if meta != nil {
		bytes, err := json.Marshal(meta)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	now := time.Now().UnixMilli()
	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		err := s.sources.Replace(ctx, tx, sourceID, storage.SourceTypeURL, normURL, available, metadataJSON, now)
		if errors.Is(err, storage.ErrSourceNotFound) {
			return errors.New("source not found")
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("failed to replace source: %w", err)
	}

	return s.getSource(ctx, sourceID)
}

// 首选入口是用户的明确选择，不能出现多个候选。
func (s *SourceService) SetPreferredSource(ctx context.Context, resourceID string, sourceID string) error {
	now := time.Now().UnixMilli()
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 先清除旧选择，维持唯一首选的不变量。
		if err := s.sources.ClearPreferred(ctx, tx, resourceID, now); err != nil {
			return err
		}
		err := s.sources.SetPreferred(ctx, tx, sourceID, resourceID, now)
		if errors.Is(err, storage.ErrSourceNotFound) {
			return errors.New("source not found on resource")
		}
		return err
	})
}

// Resource 必须保留至少一个入口；失去首选入口时按既有顺位延续访问路径。
func (s *SourceService) RemoveSource(ctx context.Context, sourceID string) error {
	now := time.Now().UnixMilli()
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		src, err := s.sources.Get(ctx, tx, sourceID)
		if err != nil {
			if errors.Is(err, storage.ErrSourceNotFound) {
				return errors.New("source not found")
			}
			return err
		}

		count, err := s.sources.CountByResource(ctx, tx, src.ResourceID)
		if err != nil {
			return err
		}
		if count <= 1 {
			return errors.New("cannot remove the only source of a resource; delete the resource instead")
		}

		if err := s.sources.Delete(ctx, tx, sourceID); err != nil {
			return err
		}

		if src.IsPreferred {
			// 以既有顺位恢复默认入口，避免引入新的猜测。
			nextPreferredID, err := s.sources.NextPreferredID(ctx, tx, src.ResourceID)
			if err != nil {
				return err
			}
			return s.sources.SetPreferred(ctx, tx, nextPreferredID, src.ResourceID, now)
		}
		return nil
	})
}

// 仅在用户明确请求时更新远程展示信息。
func (s *SourceService) RefreshURLSource(ctx context.Context, sourceID string) (*SourceDTO, error) {
	src, err := s.sources.Get(ctx, s.db.SqlDB(), sourceID)
	if err != nil {
		if errors.Is(err, storage.ErrSourceNotFound) {
			return nil, errors.New("source not found")
		}
		return nil, err
	}

	if src.Type != storage.SourceTypeURL {
		return nil, errors.New("only URL sources can be refreshed")
	}

	fetchCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	meta, available, _ := s.fetcher.FetchURL(fetchCtx, src.Location)
	metadataJSON := ""
	if meta != nil {
		bytes, err := json.Marshal(meta)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	now := time.Now().UnixMilli()
	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return s.sources.UpdateAvailability(ctx, tx, sourceID, available, metadataJSON, now)
	})
	if err != nil {
		return nil, err
	}

	return s.getSource(ctx, sourceID)
}

func (s *SourceService) getSource(ctx context.Context, sourceID string) (*SourceDTO, error) {
	model, err := s.sources.Get(ctx, s.db.SqlDB(), sourceID)
	if err != nil {
		return nil, err
	}
	dto := sourceToDTO(model)
	return &dto, nil
}
