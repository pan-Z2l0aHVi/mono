package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/id"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 将标签维护限制在单个 Resource 的上下文，避免演变为全局标签管理。
type TagService struct {
	db        *storage.DB
	resources storage.ResourceStore
	tags      storage.TagStore
	taggings  storage.TaggingStore
}

// 保持标签规则与持久化实现解耦。
func NewTagService(db *storage.DB) *TagService {
	return &TagService{
		db:        db,
		resources: storage.ResourceStore{},
		tags:      storage.TagStore{},
		taggings:  storage.TaggingStore{},
	}
}

// 标准名称决定标签身份，确保全库复用而不依赖别名或层级。
func (s *TagService) AddTagToResource(ctx context.Context, resourceID string, inputTagName string) (*TagDTO, error) {
	stdName, err := normalize.TagName(inputTagName)
	if err != nil {
		return nil, fmt.Errorf("invalid tag name: %w", err)
	}

	now := time.Now().UnixMilli()
	var tagID string

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 不为不存在的资源制造悬挂归属。
		exists, err := s.resources.Exists(ctx, tx, resourceID)
		if err != nil {
			return err
		}
		if !exists {
			return errors.New("resource not found")
		}

		// 优先复用既有标签，保持资源网络收敛。
		tag, err := s.tags.GetByName(ctx, tx, stdName)
		if errors.Is(err, storage.ErrTagNotFound) {
			tag = storage.TagModel{ID: id.NewID(), Name: stdName, CreatedAt: now}
			if err := s.tags.Insert(ctx, tx, tag); err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
		tagID = tag.ID

		// 同一 Resource 对同一标签只能保留一份归属。
		return s.taggings.Insert(ctx, tx, storage.TaggingModel{
			ResourceID: resourceID,
			TagID:      tagID,
			CreatedAt:  now,
		})
	})
	if err != nil {
		return nil, err
	}

	return &TagDTO{
		ID:        tagID,
		Name:      stdName,
		CreatedAt: now,
	}, nil
}

// 解除单个 Resource 的归属，不暗中改变其他资源。
func (s *TagService) RemoveTagFromResource(ctx context.Context, resourceID string, tagID string) error {
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		err := s.taggings.Delete(ctx, tx, resourceID, tagID)
		if errors.Is(err, storage.ErrTaggingNotFound) {
			return errors.New("tagging not found on resource")
		}
		return err
	})
	return err
}

// 通过已有标签建议降低新建近义标签的概率。
func (s *TagService) SuggestTags(ctx context.Context, query string, limit int) ([]TagDTO, error) {
	if limit <= 0 {
		limit = 10
	}

	trimmed := strings.TrimSpace(query)
	var tags []storage.TagModel
	var err error
	if trimmed == "" {
		tags, err = s.tags.List(ctx, s.db.SqlDB(), limit)
	} else {
		likePattern := "%" + trimmed + "%"
		tags, err = s.tags.SearchByName(ctx, s.db.SqlDB(), likePattern, limit)
	}
	if err != nil {
		return nil, err
	}

	result := make([]TagDTO, 0, len(tags))
	for _, tag := range tags {
		result = append(result, tagToDTO(tag))
	}
	return result, nil
}
