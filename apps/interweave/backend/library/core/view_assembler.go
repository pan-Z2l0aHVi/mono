package core

import (
	"context"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// viewAssembler 是 Resource 视图唯一的装配出口：来源与标签以批量 IN 查询取回，
// 供详情、列表、搜索与局部 Map 共享，消除逐资源的 N+1 读取。
type viewAssembler struct {
	resources storage.ResourceStore
	sources   storage.SourceStore
	tags      storage.TagStore
}

// inQueryBatch 是单条 IN 语句的安全参数上限：SQLite 变量上限有限（modernc 沿用 32766 默认），
// 留出余量按批分片，资源超量时列表/搜索/地图退化为多次批查询而不是整体报错。
// var 仅为测试注入（缩小批次验证分片与合并）；生产代码不得在运行期改写。
var inQueryBatch = 500

func chunkIDs(ids []string, size int) [][]string {
	chunks := make([][]string, 0, (len(ids)+size-1)/size)
	for start := 0; start < len(ids); start += size {
		end := start + size
		if end > len(ids) {
			end = len(ids)
		}
		chunks = append(chunks, ids[start:end])
	}
	return chunks
}

// assembleByIDs 按传入顺序装配指定 Resource 的视图；库内已不存在的 ID 不产出视图。
func (a viewAssembler) assembleByIDs(ctx context.Context, q storage.Queryer, ids []string) ([]ResourceView, error) {
	if len(ids) == 0 {
		return []ResourceView{}, nil
	}

	byID := make(map[string]Resource, len(ids))
	for _, chunk := range chunkIDs(ids, inQueryBatch) {
		rows, err := a.resources.GetByIDs(ctx, q, chunk)
		if err != nil {
			return nil, err
		}
		for _, res := range rows {
			byID[res.ID] = res
		}
	}

	// IN 查询不保证返回顺序，按调用方给定的 ID 顺序重排。
	ordered := make([]Resource, 0, len(byID))
	for _, id := range ids {
		if res, ok := byID[id]; ok {
			ordered = append(ordered, res)
		}
	}
	return a.assembleMany(ctx, q, ordered)
}

// assembleMany 为已取出的 Resource 行批量装配视图：来源与标签按批 IN 查询后跨批合并。
func (a viewAssembler) assembleMany(ctx context.Context, q storage.Queryer, resources []Resource) ([]ResourceView, error) {
	ids := make([]string, len(resources))
	for i, res := range resources {
		ids[i] = res.ID
	}

	// 同一 Resource 的 ID 只会落在一个分片内，跨批合并不需要去重。
	sourcesByResource := make(map[string][]Source)
	tagsByResource := make(map[string][]Tag)
	for _, chunk := range chunkIDs(ids, inQueryBatch) {
		sources, err := a.sources.ListByResources(ctx, q, chunk)
		if err != nil {
			return nil, err
		}
		for id, rows := range sources {
			sourcesByResource[id] = rows
		}
		tags, err := a.tags.TagsByResources(ctx, q, chunk)
		if err != nil {
			return nil, err
		}
		for id, rows := range tags {
			tagsByResource[id] = rows
		}
	}

	views := make([]ResourceView, 0, len(resources))
	for _, res := range resources {
		view := ResourceView{Resource: res}
		view.Sources = sourcesByResource[res.ID]
		if view.Sources == nil {
			view.Sources = []Source{}
		}
		view.Tags = tagsByResource[res.ID]
		if view.Tags == nil {
			view.Tags = []Tag{}
		}
		views = append(views, view)
	}
	return views, nil
}
