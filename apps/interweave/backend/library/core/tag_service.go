package core

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
func (s *TagService) AddTagToResource(ctx context.Context, resourceID string, inputTagName string) (Tag, error) {
	stdName, err := normalize.TagName(inputTagName)
	if err != nil {
		return Tag{}, fmt.Errorf("invalid tag name: %w", err)
	}

	now := time.Now().UnixMilli()
	var tag Tag

	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 不为不存在的资源制造悬挂归属。
		exists, err := s.resources.Exists(ctx, tx, resourceID)
		if err != nil {
			return err
		}
		if !exists {
			return ErrResourceNotFound
		}

		stored, err := resolveOrCreateTag(ctx, tx, s.tags, stdName, now)
		if err != nil {
			return err
		}
		tag = stored

		// 同一 Resource 对同一标签只能保留一份归属。
		return s.taggings.Insert(ctx, tx, storage.TaggingModel{
			ResourceID: resourceID,
			TagID:      tag.ID,
			CreatedAt:  now,
		})
	})
	if err != nil {
		return Tag{}, err
	}

	return tag, nil
}

// SetResourceTags 以替换式集合语义重设单个 Resource 的标签：提交的名称集合归一化后
// 就是该 Resource 的完整标签集合，集合外的既有归属被解除，缺失的被补插。
// 名称先整体校验再写库，任一非法即整体失败，不留下半应用的集合。
func (s *TagService) SetResourceTags(ctx context.Context, resourceID string, names []string) ([]Tag, error) {
	stdNames, err := normalizeTagNames(names)
	if err != nil {
		return nil, err
	}

	now := time.Now().UnixMilli()
	var target []Tag
	err = s.db.WithTx(ctx, func(tx *sql.Tx) error {
		// 不为不存在的资源制造悬挂归属。
		exists, err := s.resources.Exists(ctx, tx, resourceID)
		if err != nil {
			return err
		}
		if !exists {
			return ErrResourceNotFound
		}

		target = make([]Tag, 0, len(stdNames))
		keepIDs := make([]string, 0, len(stdNames))
		for _, stdName := range stdNames {
			tag, err := resolveOrCreateTag(ctx, tx, s.tags, stdName, now)
			if err != nil {
				return err
			}
			target = append(target, tag)
			keepIDs = append(keepIDs, tag.ID)

			// 同一 Resource 对同一标签只能保留一份归属；Insert 的 OR IGNORE 让补插幂等，
			// 既有归属的 created_at 原样保留。
			if err := s.taggings.Insert(ctx, tx, storage.TaggingModel{
				ResourceID: resourceID,
				TagID:      tag.ID,
				CreatedAt:  now,
			}); err != nil {
				return err
			}
		}
		// 差集删除放在补插之后：目标集合内的归属必然已存在，NOT IN 过滤后剩下的就是要解除的。
		return s.taggings.DeleteExcept(ctx, tx, resourceID, keepIDs)
	})
	if err != nil {
		return nil, err
	}
	return target, nil
}

// normalizeTagNames 归一化一批标签名并去重；任一名称非法即整体失败，保持调用方的事务性预期。
func normalizeTagNames(names []string) ([]string, error) {
	stdNames := make([]string, 0, len(names))
	seen := make(map[string]struct{}, len(names))
	for _, name := range names {
		stdName, err := normalize.TagName(name)
		if err != nil {
			return nil, fmt.Errorf("invalid tag name: %w", err)
		}
		if _, dup := seen[stdName]; dup {
			continue
		}
		seen[stdName] = struct{}{}
		stdNames = append(stdNames, stdName)
	}
	return stdNames, nil
}

// resolveOrCreateTag 在事务内按标准名复用既有标签，缺失时新建并补色。
// 全部写标签的路径（单标签增删、替换式集合、纳入时初始标签）共享这份身份规则。
func resolveOrCreateTag(ctx context.Context, tx *sql.Tx, tags storage.TagStore, stdName string, now int64) (Tag, error) {
	// 优先复用既有标签，保持资源网络收敛。
	stored, err := tags.GetByName(ctx, tx, stdName)
	if errors.Is(err, storage.ErrTagNotFound) {
		stored = Tag{ID: id.NewID(), Name: stdName, CreatedAt: now}
		if err := tags.Insert(ctx, tx, stored); err != nil {
			return Tag{}, err
		}
		color := storage.RandomTagColor()
		if err := tags.EnsureColor(ctx, tx, stdName, color); err != nil {
			return Tag{}, err
		}
		// tag_colors 的行只随 tags 的行一起产生（新建时同事务写入，启动补色只遍历
		// 已有标签），所以走到这里的名称必定还没有颜色行，OR IGNORE 不会与刚生成的
		// 色分叉，返回值与后续读取一致。
		stored.Color = color
	} else if err != nil {
		return Tag{}, err
	}
	return stored, nil
}

// 解除单个 Resource 的归属，不暗中改变其他资源。
func (s *TagService) RemoveTagFromResource(ctx context.Context, resourceID string, tagID string) error {
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return mapNotFound(s.taggings.Delete(ctx, tx, resourceID, tagID))
	})
	return err
}

// 通过已有标签建议降低新建近义标签的概率。
func (s *TagService) SuggestTags(ctx context.Context, query string, limit int) ([]Tag, error) {
	if limit <= 0 {
		limit = 10
	}

	trimmed := strings.TrimSpace(query)
	var tags []Tag
	var err error
	if trimmed == "" {
		tags, err = s.tags.List(ctx, s.db.SqlDB(), limit)
	} else {
		likePattern := "%" + escapeLike(trimmed) + "%"
		tags, err = s.tags.SearchByName(ctx, s.db.SqlDB(), likePattern, limit)
	}
	if err != nil {
		return nil, err
	}
	return tags, nil
}
