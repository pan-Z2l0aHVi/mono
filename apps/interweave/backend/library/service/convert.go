package service

import "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"

// 将持久化 Source 映射为前端可见视图。
func sourceToDTO(src storage.SourceModel) SourceDTO {
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

// 将持久化 Tag 映射为前端可见视图。
func tagToDTO(tag storage.TagModel) TagDTO {
	return TagDTO{
		ID:        tag.ID,
		Name:      tag.Name,
		CreatedAt: tag.CreatedAt,
	}
}
