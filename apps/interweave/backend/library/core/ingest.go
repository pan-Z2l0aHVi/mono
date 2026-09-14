package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/id"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// ADR-0014 的单次纳入总时限；core 内唯一的 10 秒时钟，所有 URL 纳入路径经 probe 共享。
// var 仅为测试注入（缩短预算验证 probe 真正受它约束）；生产代码不得在运行期改写。
var ingestBudget = 10 * time.Second

// ingestion 汇聚全部纳入路径共享的输入归一化、可用性探测与事务写入，
// 使“归一化 → 探测 → 事务写入”在 core 内只有一份实现。
type ingestion struct {
	db        *storage.DB
	fetcher   *remote.Fetcher
	resources storage.ResourceStore
	sources   storage.SourceStore
}

// 保持纳入规则与持久化实现解耦。
func newIngestion(db *storage.DB, fetcher *remote.Fetcher) *ingestion {
	return &ingestion{db: db, fetcher: fetcher}
}

// probeOutcome 汇总一次可用性探测的产出。
type probeOutcome struct {
	available    bool
	metadataJSON string
	defaultTitle string
}

// normalizeInput 把用户输入归一化为稳定位置（ADR-0013），错误文案与既有纳入路径一致。
// 归一化独立于 probe，使调用方能在存在性检查之后再开始探测而不重复归一化。
func (*ingestion) normalizeInput(input string, srcType storage.SourceType) (string, error) {
	switch srcType {
	case storage.SourceTypeFile:
		cleanPath, err := normalize.FilePath(input)
		if err != nil {
			return "", fmt.Errorf("invalid file path: %w", err)
		}
		return cleanPath, nil
	case storage.SourceTypeURL:
		normURL, err := normalize.URL(input)
		if err != nil {
			return "", fmt.Errorf("invalid URL: %w", err)
		}
		return normURL, nil
	default:
		return "", fmt.Errorf("unsupported source type: %s", srcType)
	}
}

// probe 在 ADR-0014 预算内判定入口可达性并整理展示上下文：文件只做轻量 stat，
// URL 做一次限时基础元数据抓取；探测失败不是错误，只决定 available 的取值。
// 位置必须是 normalizeInput 的产物。
func (ing *ingestion) probe(ctx context.Context, location string, srcType storage.SourceType) probeOutcome {
	switch srcType {
	case storage.SourceTypeFile:
		outcome := probeOutcome{defaultTitle: fileDefaultTitle(location)}
		if _, err := os.Stat(location); err == nil {
			outcome.available = true
		}
		return outcome
	case storage.SourceTypeURL:
		// ADR-0015：无可用页面标题时，默认标题在创建时由 hostname 一次性确定。
		parsed, _ := url.Parse(location)
		outcome := probeOutcome{defaultTitle: parsed.Hostname()}

		// 重定向链与元数据抓取共享同一 10 秒预算。
		fetchCtx, cancel := context.WithTimeout(ctx, ingestBudget)
		defer cancel()

		meta, available, _ := ing.fetcher.FetchURL(fetchCtx, location)
		if meta != nil {
			if meta.Title != "" {
				outcome.defaultTitle = meta.Title
			}
			if bytes, err := json.Marshal(meta); err == nil {
				outcome.metadataJSON = string(bytes)
			}
		}
		outcome.available = available
		return outcome
	default:
		return probeOutcome{}
	}
}

// ADR-0015：文件入口以文件名作为默认标题，异常路径名回退到清理后的完整路径。
func fileDefaultTitle(cleanPath string) string {
	base := filepath.Base(cleanPath)
	if base == "" || base == "." || base == "/" {
		return cleanPath
	}
	return base
}

// ingestMode 区分纳入事务内的写入组合。
type ingestMode int

const (
	// 新建 Resource 并写入首个 Source：该 Source 依 ADR-0016 自动成为首选，顺位从 0 开始。
	ingestNewResource ingestMode = iota
	// 为既有 Resource 追加 Source：顺位接续最大值，不改变用户已选定的首选。
	ingestAppendSource
	// 原位替换 Source 数据：保留添加顺位与首选角色（ADR-0016）。
	ingestReplaceSource
	// 仅更新 URL Source 的可用状态与展示元数据。
	ingestRefreshSource
)

// ingestWrite 携带一次纳入事务的输入；身份、时间戳与顺位由 write 在事务内分配。
type ingestWrite struct {
	mode         ingestMode
	defaultTitle string // 仅 ingestNewResource 使用：ADR-0015 首次纳入的默认标题
	resourceID   string // 仅 ingestAppendSource 使用：归属目标
	sourceID     string // ingestReplaceSource / ingestRefreshSource：原位目标
	srcType      storage.SourceType
	location     string
	probe        probeOutcome
}

// ingestResult 返回事务写入确定的稳定身份，供调用方回读视图。
type ingestResult struct {
	resourceID string
	sourceID   string
}

// write 是所有纳入路径共享的事务写入：在单一事务内分配身份与时间戳，并维持
// ADR-0016 的“至少一个 Source 且恰有一个首选”不变量与 ADR-0015 的标题所有权。
func (ing *ingestion) write(ctx context.Context, w ingestWrite) (ingestResult, error) {
	now := time.Now().UnixMilli()
	result := ingestResult{resourceID: w.resourceID, sourceID: w.sourceID}

	err := ing.db.WithTx(ctx, func(tx *sql.Tx) error {
		switch w.mode {
		case ingestNewResource:
			res := Resource{
				ID:        id.NewID(),
				Title:     w.defaultTitle,
				Note:      "",
				CreatedAt: now,
				UpdatedAt: now,
			}
			src := Source{
				ID:           id.NewID(),
				ResourceID:   res.ID,
				Type:         w.srcType,
				Location:     w.location,
				Available:    w.probe.available,
				IsPreferred:  true,
				OrderIndex:   0,
				MetadataJSON: w.probe.metadataJSON,
				CreatedAt:    now,
				UpdatedAt:    now,
			}
			if err := ing.resources.Insert(ctx, tx, res); err != nil {
				return err
			}
			if err := ing.sources.Insert(ctx, tx, src); err != nil {
				return err
			}
			result.resourceID = res.ID
			result.sourceID = src.ID
			return nil
		case ingestAppendSource:
			maxOrder, err := ing.sources.MaxOrder(ctx, tx, w.resourceID)
			if err != nil {
				return err
			}
			src := Source{
				ID:           id.NewID(),
				ResourceID:   w.resourceID,
				Type:         w.srcType,
				Location:     w.location,
				Available:    w.probe.available,
				IsPreferred:  false,
				OrderIndex:   maxOrder + 1,
				MetadataJSON: w.probe.metadataJSON,
				CreatedAt:    now,
				UpdatedAt:    now,
			}
			if err := ing.sources.Insert(ctx, tx, src); err != nil {
				return err
			}
			result.sourceID = src.ID
			return nil
		case ingestReplaceSource:
			// Replace 不触碰 order_index 与 is_preferred，顺位与首选角色原样保留。
			return mapNotFound(ing.sources.Replace(ctx, tx, w.sourceID, w.srcType, w.location, w.probe.available, w.probe.metadataJSON, now))
		case ingestRefreshSource:
			return mapNotFound(ing.sources.UpdateAvailability(ctx, tx, w.sourceID, w.probe.available, w.probe.metadataJSON, now))
		default:
			return fmt.Errorf("unknown ingest mode: %d", w.mode)
		}
	})
	if err != nil {
		return ingestResult{}, err
	}
	return result, nil
}
