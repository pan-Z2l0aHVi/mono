package core

import (
	"context"
	"database/sql"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// PreparedFilePreview 是待添加文件的稳定位置、权威展示分类与短期媒体预览授权。
type PreparedFilePreview struct {
	Location string
	Kind     storage.ResourceKind
	Token    string
	MediaURL string
}

// ResourceLocationMatch 是「库内已有同一入口」的命中项，只带确认框需要的字段。
type ResourceLocationMatch struct {
	ResourceID string
	Title      string
	Location   string
}

// 规范化待添加文件并复用 Resource 展示分类；仅图片与视频在已注入预览存储时授予短期媒体读取 token。
func (s *Library) PrepareFilePreview(inputPath string) (PreparedFilePreview, error) {
	location, err := s.ingest.normalizeInput(inputPath, storage.SourceTypeFile)
	if err != nil {
		return PreparedFilePreview{}, err
	}
	kind := resourceKindForFile(location)
	prepared := PreparedFilePreview{Location: location, Kind: kind}
	if (kind == storage.ResourceKindImage || kind == storage.ResourceKindVideo) && s.previews != nil {
		token, mediaURL, err := s.previews.Register(location)
		if err != nil {
			return PreparedFilePreview{}, err
		}
		prepared.Token = token
		prepared.MediaURL = mediaURL
	}
	return prepared, nil
}

// ReleaseFilePreview 撤销不再需要的待添加文件短期媒体预览授权。
func (s *Library) ReleaseFilePreview(token string) bool {
	if token == "" || s.previews == nil {
		return false
	}
	return s.previews.Release(token)
}

// 按归一化位置反查库内已有该入口的 Resource，供添加前的重复提示使用。
// 比对以 normalizeInput 的结果为准，因此 `~/a.png` 与其绝对路径命中同一条记录。
func (s *Library) FindResourceLocationMatches(
	ctx context.Context,
	input string,
	srcType storage.SourceType,
) ([]ResourceLocationMatch, error) {
	location, err := s.ingest.normalizeInput(input, srcType)
	if err != nil {
		return nil, err
	}

	sources, err := s.sources.ListSourcesByLocations(ctx, s.db.SqlDB(), srcType, []string{location})
	if err != nil {
		return nil, err
	}
	if len(sources) == 0 {
		return []ResourceLocationMatch{}, nil
	}

	// 同一 Resource 可能在同一位置登记多条 Source（apps/interweave/AGENTS.md「重复 Source」），
	// 提示按 Resource 去重：用户看到的是「已有哪几个资源」，不是「有几条记录」。
	resourceIDs := make([]string, 0, len(sources))
	seen := make(map[string]bool, len(sources))
	for _, src := range sources {
		if seen[src.ResourceID] {
			continue
		}
		seen[src.ResourceID] = true
		resourceIDs = append(resourceIDs, src.ResourceID)
	}

	views, err := s.views.assembleByIDs(ctx, s.db.SqlDB(), resourceIDs)
	if err != nil {
		return nil, err
	}
	// 按纳入时间倒序，与 ListResources 的浏览顺序一致；ID 兜底使同毫秒创建也有确定顺序。
	sort.SliceStable(views, func(i, j int) bool {
		if views[i].Resource.CreatedAt != views[j].Resource.CreatedAt {
			return views[i].Resource.CreatedAt > views[j].Resource.CreatedAt
		}
		return views[i].Resource.ID < views[j].Resource.ID
	})

	matches := make([]ResourceLocationMatch, 0, len(views))
	for _, view := range views {
		matches = append(matches, ResourceLocationMatch{
			ResourceID: view.Resource.ID,
			Title:      view.Resource.Title,
			Location:   location,
		})
	}
	return matches, nil
}

// CreateResourceInput 携带一次纳入的用户输入；Location 是原始输入，归一化由 core 完成。
type CreateResourceInput struct {
	// Kind 是入口类型，只接受 SourceTypeFile / SourceTypeURL。
	Kind storage.SourceType
	// Location 是用户的原始输入。
	Location string
	// InitialTitle 是可选的初始标题；trim 后非空才生效，否则用 probe 的默认标题
	//（AGENTS.md「Resource 标题」：只有首次纳入可从首个 Source 取得默认值）。
	InitialTitle string
	// Tags 是可选的初始标签名集合（原始输入），语义同 Library.SetResourceTags。
	Tags []string
}

// CreateResource 是纳入新 Resource 的唯一入口：归一化、可用性探测、Resource + 首选 Source
// 与初始标签在单事务内一次建齐，失败不留半成品。
func (s *Library) CreateResource(ctx context.Context, input CreateResourceInput) (*ResourceView, error) {
	location, err := s.ingest.normalizeInput(input.Location, input.Kind)
	if err != nil {
		return nil, err
	}

	outcome := s.ingest.probe(ctx, location, input.Kind)
	defaultTitle := outcome.defaultTitle
	if trimmed := strings.TrimSpace(input.InitialTitle); trimmed != "" {
		defaultTitle = trimmed
	}
	result, err := s.ingest.write(ctx, ingestWrite{
		mode:         ingestNewResource,
		defaultTitle: defaultTitle,
		srcType:      input.Kind,
		location:     location,
		probe:        outcome,
		tagNames:     input.Tags,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	s.resyncIndex()
	return s.GetResource(ctx, result.resourceID)
}

// 允许用户维护库内语义，不影响外部内容。
func (s *Library) UpdateResourceTitle(ctx context.Context, resourceID string, newTitle string) (*ResourceView, error) {
	trimmed := strings.TrimSpace(newTitle)
	if trimmed == "" {
		return nil, ErrResourceTitleEmpty
	}

	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return mapNotFound(s.resources.UpdateTitle(ctx, tx, resourceID, trimmed, now))
	})
	if err != nil {
		return nil, err
	}

	return s.GetResource(ctx, resourceID)
}

// 仅保存简短个人上下文。
func (s *Library) UpdateResourceNote(ctx context.Context, resourceID string, note string) (*ResourceView, error) {
	now := time.Now().UnixMilli()
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return mapNotFound(s.resources.UpdateNote(ctx, tx, resourceID, note, now))
	})
	if err != nil {
		return nil, err
	}

	return s.GetResource(ctx, resourceID)
}

// 从资源库移除记录，不触及任何外部内容。
func (s *Library) DeleteResource(ctx context.Context, resourceID string) error {
	err := s.db.WithTx(ctx, func(tx *sql.Tx) error {
		return mapNotFound(s.resources.Delete(ctx, tx, resourceID))
	})
	if err != nil {
		return err
	}

	// 外键 ON DELETE CASCADE 已连带删除该 Resource 的 Source，监听集合需要跟着收敛。
	s.resyncIndex()
	return nil
}

// 以稳定身份读取资源详情。
func (s *Library) GetResource(ctx context.Context, resourceID string) (*ResourceView, error) {
	res, err := s.resources.Get(ctx, s.db.SqlDB(), resourceID)
	if err != nil {
		return nil, mapNotFound(err)
	}

	views, err := s.views.assembleMany(ctx, s.db.SqlDB(), []Resource{res})
	if err != nil {
		return nil, err
	}
	return &views[0], nil
}

// 以最近纳入优先的顺序支持资源库浏览。
func (s *Library) ListResources(ctx context.Context) ([]ResourceView, error) {
	models, err := s.resources.List(ctx, s.db.SqlDB())
	if err != nil {
		return nil, err
	}
	return s.views.assembleMany(ctx, s.db.SqlDB(), models)
}
