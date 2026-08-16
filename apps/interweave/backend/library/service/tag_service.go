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
	db *storage.DB
}

// 保持标签规则与持久化实现解耦。
func NewTagService(db *storage.DB) *TagService {
	return &TagService{db: db}
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
		var exists int
		err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM resources WHERE id = ?`, resourceID).Scan(&exists)
		if err != nil {
			return err
		}
		if exists == 0 {
			return errors.New("resource not found")
		}

		// 优先复用既有标签，保持资源网络收敛。
		err = tx.QueryRowContext(ctx, `SELECT id FROM tags WHERE name = ?`, stdName).Scan(&tagID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				tagID = id.NewID()
				_, err = tx.ExecContext(ctx, `INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)`, tagID, stdName, now)
				if err != nil {
					return err
				}
			} else {
				return err
			}
		}

		// 同一 Resource 对同一标签只能保留一份归属。
		_, err = tx.ExecContext(ctx, `
			INSERT OR IGNORE INTO taggings (resource_id, tag_id, created_at)
			VALUES (?, ?, ?)
		`, resourceID, tagID, now)
		return err
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
	return s.db.WithTx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `
			DELETE FROM taggings WHERE resource_id = ? AND tag_id = ?
		`, resourceID, tagID)
		if err != nil {
			return err
		}
		rows, err := res.RowsAffected()
		if err != nil {
			return err
		}
		if rows == 0 {
			return errors.New("tagging not found on resource")
		}
		return nil
	})
}

// 通过已有标签建议降低新建近义标签的概率。
func (s *TagService) SuggestTags(ctx context.Context, query string, limit int) ([]TagDTO, error) {
	if limit <= 0 {
		limit = 10
	}

	trimmed := strings.TrimSpace(query)
	var rows *sql.Rows
	var err error

	if trimmed == "" {
		rows, err = s.db.SqlDB().QueryContext(ctx, `
			SELECT id, name, created_at
			FROM tags
			ORDER BY name ASC
			LIMIT ?
		`, limit)
	} else {
		likePattern := "%" + trimmed + "%"
		rows, err = s.db.SqlDB().QueryContext(ctx, `
			SELECT id, name, created_at
			FROM tags
			WHERE name LIKE ?
			ORDER BY name ASC
			LIMIT ?
		`, likePattern, limit)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []TagDTO
	for rows.Next() {
		var tag TagDTO
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	if tags == nil {
		tags = []TagDTO{}
	}
	return tags, nil
}
