package service

import (
	"context"
	"database/sql"
	"errors"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 仅从 Tagging 推导可解释的资源关系，不存储手工网络。
type MapService struct {
	db              *storage.DB
	resourceService *ResourceService
}

// 保持 Map 推导与持久化实现解耦。
func NewMapService(db *storage.DB, resourceService *ResourceService) *MapService {
	return &MapService{
		db:              db,
		resourceService: resourceService,
	}
}

// 用标签共现提供全局主题地形，并保留未连通资源的可见性。
func (s *MapService) GetGlobalMap(ctx context.Context) (*GlobalMapDTO, error) {
	// 未标记资源不进入网络，但不能从用户视野中消失。
	var totalResources int
	err := s.db.SqlDB().QueryRowContext(ctx, `SELECT COUNT(*) FROM resources`).Scan(&totalResources)
	if err != nil {
		return nil, err
	}

	// 未标记资源不进入网络，但不能从用户视野中消失。
	var unconnected int
	err = s.db.SqlDB().QueryRowContext(ctx, `
		SELECT COUNT(*) FROM resources r
		WHERE NOT EXISTS (SELECT 1 FROM taggings tg WHERE tg.resource_id = r.id)
	`).Scan(&unconnected)
	if err != nil {
		return nil, err
	}

	// 主题强度由实际归属数量决定。
	tagRows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT t.id, t.name, COUNT(tg.resource_id) AS res_count
		FROM tags t
		INNER JOIN taggings tg ON tg.tag_id = t.id
		GROUP BY t.id, t.name
		HAVING res_count > 0
		ORDER BY res_count DESC
	`)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()

	var nodes []TagNodeDTO
	for tagRows.Next() {
		var n TagNodeDTO
		if err := tagRows.Scan(&n.TagID, &n.Name, &n.ResourceCount); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	if nodes == nil {
		nodes = []TagNodeDTO{}
	}

	// 关联必须可追溯到共享标签，不能生成不透明连线。
	edgeRows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT tg1.tag_id, tg2.tag_id, COUNT(DISTINCT tg1.resource_id) as weight
		FROM taggings tg1
		INNER JOIN taggings tg2 ON tg1.resource_id = tg2.resource_id AND tg1.tag_id < tg2.tag_id
		GROUP BY tg1.tag_id, tg2.tag_id
		ORDER BY weight DESC
	`)
	if err != nil {
		return nil, err
	}
	defer edgeRows.Close()

	var edges []TagEdgeDTO
	for edgeRows.Next() {
		var e TagEdgeDTO
		if err := edgeRows.Scan(&e.SourceTagID, &e.TargetTagID, &e.Weight); err != nil {
			return nil, err
		}
		edges = append(edges, e)
	}
	if edges == nil {
		edges = []TagEdgeDTO{}
	}

	return &GlobalMapDTO{
		TagNodes:           nodes,
		TagEdges:           edges,
		UnconnectedCount:   unconnected,
		TotalResourceCount: totalResources,
	}, nil
}

// 局部探索只围绕用户当前选择的主题展开。
func (s *MapService) GetLocalMap(ctx context.Context, tagID string) (*LocalMapDTO, error) {
	var focused TagDTO
	err := s.db.SqlDB().QueryRowContext(ctx, `
		SELECT id, name, created_at FROM tags WHERE id = ?
	`, tagID).Scan(&focused.ID, &focused.Name, &focused.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("tag not found")
		}
		return nil, err
	}

	// 先确立当前主题的直接资源范围。
	resRows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT r.id
		FROM resources r
		INNER JOIN taggings tg ON tg.resource_id = r.id
		WHERE tg.tag_id = ?
		ORDER BY r.created_at DESC
	`, tagID)
	if err != nil {
		return nil, err
	}
	defer resRows.Close()

	var resList []ResourceDTO
	for resRows.Next() {
		var resID string
		if err := resRows.Scan(&resID); err != nil {
			return nil, err
		}
		dto, err := s.resourceService.GetResource(ctx, resID)
		if err == nil && dto != nil {
			resList = append(resList, *dto)
		}
	}
	if resList == nil {
		resList = []ResourceDTO{}
	}

	// 仅展示能由当前资源归属解释的相邻主题。
	coocRows, err := s.db.SqlDB().QueryContext(ctx, `
		SELECT t.id, t.name, COUNT(DISTINCT tg2.resource_id) as weight
		FROM taggings tg1
		INNER JOIN taggings tg2 ON tg1.resource_id = tg2.resource_id
		INNER JOIN tags t ON t.id = tg2.tag_id
		WHERE tg1.tag_id = ? AND tg2.tag_id != ?
		GROUP BY t.id, t.name
		ORDER BY weight DESC
	`, tagID, tagID)
	if err != nil {
		return nil, err
	}
	defer coocRows.Close()

	var coocNodes []TagNodeDTO
	for coocRows.Next() {
		var n TagNodeDTO
		if err := coocRows.Scan(&n.TagID, &n.Name, &n.ResourceCount); err != nil {
			return nil, err
		}
		coocNodes = append(coocNodes, n)
	}
	if coocNodes == nil {
		coocNodes = []TagNodeDTO{}
	}

	return &LocalMapDTO{
		FocusedTag:      focused,
		Resources:       resList,
		CooccurringTags: coocNodes,
	}, nil
}
