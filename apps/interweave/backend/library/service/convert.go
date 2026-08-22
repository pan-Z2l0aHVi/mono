package service

import "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"

// 将领域 Source 映射为前端可见视图。
func sourceToDTO(src core.Source) SourceDTO {
	return SourceDTO{
		ID:           src.ID,
		ResourceID:   src.ResourceID,
		Type:         src.Type,
		Location:     src.Location,
		Available:    src.Available,
		IsPreferred:  src.IsPreferred,
		OrderIndex:   src.OrderIndex,
		MetadataJSON: src.MetadataJSON,
		CreatedAt:    src.CreatedAt,
		UpdatedAt:    src.UpdatedAt,
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
	for _, src := range view.Sources {
		srcDTO := sourceToDTO(src)
		dto.Sources = append(dto.Sources, srcDTO)
		if dto.PreferredID == "" && srcDTO.IsPreferred {
			dto.PreferredID = srcDTO.ID
		}
	}
	if dto.Sources == nil {
		dto.Sources = []SourceDTO{}
	}
	for _, tag := range view.Tags {
		dto.Tags = append(dto.Tags, tagToDTO(tag))
	}
	if dto.Tags == nil {
		dto.Tags = []TagDTO{}
	}
	return dto
}

func toTagNodeDTO(n core.TagAggregate) TagNodeDTO {
	return TagNodeDTO{
		TagID:         n.TagID,
		Name:          n.Name,
		ResourceCount: n.ResourceCount,
	}
}
