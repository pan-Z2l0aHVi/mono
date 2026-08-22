package core

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 仅从 Tagging 推导可解释的资源关系，不存储手工网络。
type MapService struct {
	db              *storage.DB
	resourceService *ResourceService
	resources       storage.ResourceStore
	tags            storage.TagStore
	mapQueries      storage.MapStore
}

// 保持 Map 推导与持久化实现解耦。
func NewMapService(db *storage.DB, resourceService *ResourceService) *MapService {
	return &MapService{
		db:              db,
		resourceService: resourceService,
		resources:       storage.ResourceStore{},
		tags:            storage.TagStore{},
		mapQueries:      storage.MapStore{},
	}
}

// 用标签共现提供全局主题地形，并保留未连通资源的可见性。
func (s *MapService) GetGlobalMap(ctx context.Context) (*GlobalMap, error) {
	// 未标记资源不进入网络，但不能从用户视野中消失。
	totalResources, err := s.resources.Count(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}

	unconnected, err := s.mapQueries.CountUnconnected(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}

	// 主题强度由实际归属数量决定。
	nodes, err := s.mapQueries.TagNodes(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}

	// 关联必须可追溯到共享标签，不能生成不透明连线。
	edges, err := s.mapQueries.TagEdges(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}

	result := &GlobalMap{
		TagNodes:           nodes,
		TagEdges:           edges,
		UnconnectedCount:   unconnected,
		TotalResourceCount: totalResources,
	}
	if result.TagNodes == nil {
		result.TagNodes = []TagAggregate{}
	}
	if result.TagEdges == nil {
		result.TagEdges = []TagEdge{}
	}
	return result, nil
}

// 局部探索只围绕用户当前选择的主题展开。
func (s *MapService) GetLocalMap(ctx context.Context, tagID string) (*LocalMap, error) {
	focused, err := s.tags.Get(ctx, s.db.SqlDB(), tagID)
	if err != nil {
		return nil, mapNotFound(err)
	}

	// 先确立当前主题的直接资源范围。
	resIDs, err := s.mapQueries.ResourceIDsByTag(ctx, s.db.SqlDB(), tagID)
	if err != nil {
		return nil, err
	}

	resList := make([]ResourceView, 0, len(resIDs))
	for _, resID := range resIDs {
		view, err := s.resourceService.GetResource(ctx, resID)
		if err == nil && view != nil {
			resList = append(resList, *view)
		}
	}

	// 仅展示能由当前资源归属解释的相邻主题。
	coocNodes, err := s.mapQueries.CooccurringTags(ctx, s.db.SqlDB(), tagID)
	if err != nil {
		return nil, err
	}

	result := &LocalMap{
		FocusedTag:      focused,
		Resources:       resList,
		CooccurringTags: coocNodes,
	}
	if result.CooccurringTags == nil {
		result.CooccurringTags = []TagAggregate{}
	}
	return result, nil
}
