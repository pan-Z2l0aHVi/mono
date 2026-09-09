package service

import (
	"encoding/json"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
)

// 解析 Source 的抓取元数据；空串或非法 JSON 一律返回 nil，解析失败不阻塞视图装配。
func parseSourceMetadata(metadataJSON string) *SourceMetadataDTO {
	if metadataJSON == "" {
		return nil
	}
	var metadata SourceMetadataDTO
	if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
		return nil
	}
	return &metadata
}

// mapped 将领域切片逐项映射为视图切片，并保证结果非 nil——
// Wails/JSON 序列化要求空集合输出 [] 而非 null，这一语义在此统一收口。
func mapped[From any, To any](items []From, mapFn func(From) To) []To {
	result := make([]To, 0, len(items))
	for _, item := range items {
		result = append(result, mapFn(item))
	}
	return result
}

// 将领域 Source 映射为前端可见视图。
func sourceToDTO(src core.Source) SourceDTO {
	return SourceDTO{
		ID:          src.ID,
		ResourceID:  src.ResourceID,
		Type:        src.Type,
		Location:    src.Location,
		Available:   src.Available,
		IsPreferred: src.IsPreferred,
		OrderIndex:  src.OrderIndex,
		Metadata:    parseSourceMetadata(src.MetadataJSON),
		CreatedAt:   src.CreatedAt,
		UpdatedAt:   src.UpdatedAt,
	}
}

// 将领域 Tag 映射为前端可见视图。
func tagToDTO(tag core.Tag) TagDTO {
	return TagDTO{
		ID:        tag.ID,
		Name:      tag.Name,
		CreatedAt: tag.CreatedAt,
	}
}

// 将领域 Resource 视图映射为前端可见视图，并派生首选入口。
func resourceViewToDTO(view *core.ResourceView) *ResourceDTO {
	dto := &ResourceDTO{
		ID:        view.Resource.ID,
		Title:     view.Resource.Title,
		Note:      view.Resource.Note,
		CreatedAt: view.Resource.CreatedAt,
		UpdatedAt: view.Resource.UpdatedAt,
	}
	sources := mapped(view.Sources, sourceToDTO)
	dto.Sources = sources
	dto.PreferredID = ""
	for _, srcDTO := range sources {
		if srcDTO.IsPreferred {
			dto.PreferredID = srcDTO.ID
			break
		}
	}
	dto.Tags = mapped(view.Tags, tagToDTO)
	return dto
}

func toTagNodeDTO(n core.TagAggregate) TagNodeDTO {
	return TagNodeDTO{
		TagID:         n.TagID,
		Name:          n.Name,
		ResourceCount: n.ResourceCount,
	}
}

func toTagEdgeDTO(e core.TagEdge) TagEdgeDTO {
	return TagEdgeDTO{
		SourceTagID: e.SourceTagID,
		TargetTagID: e.TargetTagID,
		Weight:      e.Weight,
	}
}
