package core

import "context"

// 用标签共现提供全局主题地形，并保留未连通资源的可见性。
func (s *Library) GetGlobalMap(ctx context.Context) (*GlobalMap, error) {
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
func (s *Library) GetLocalMap(ctx context.Context, tagID string) (*LocalMap, error) {
	focused, err := s.tags.Get(ctx, s.db.SqlDB(), tagID)
	if err != nil {
		return nil, mapNotFound(err)
	}

	resIDs, err := s.mapQueries.ResourceIDsByTag(ctx, s.db.SqlDB(), tagID)
	if err != nil {
		return nil, err
	}

	// 装配失败必须让整次探索失败：静默丢弃资源会呈现缺少关系依据的残缺网络，
	// 破坏 AGENTS.md「资源关系地图（Map）」的前提——Resource 的关联仅从共享语义标签派生。
	resList, err := s.views.assembleByIDs(ctx, s.db.SqlDB(), resIDs)
	if err != nil {
		return nil, err
	}

	// 仅展示能由当前资源归属解释的相邻主题。
	cooccurringTags, err := s.mapQueries.CooccurringTags(ctx, s.db.SqlDB(), tagID)
	if err != nil {
		return nil, err
	}

	result := &LocalMap{
		FocusedTag:      focused,
		Resources:       resList,
		CooccurringTags: cooccurringTags,
	}
	if result.CooccurringTags == nil {
		result.CooccurringTags = []TagAggregate{}
	}
	return result, nil
}
