package core

import (
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// PendingPreviewStore 是待添加文件短期媒体预览授权的窄 port。
// 由 library.NewRuntime 注入包装 *media.PendingPreviewRegistry 与 media.PendingMediaURL 的 adapter，
// 保证 core 零 media 导入、零循环依赖。
type PendingPreviewStore interface {
	Register(location string) (token string, mediaURL string, err error)
	Release(token string) bool
}

// Library 聚合资源库核心领域规则（Resource、Source、Tag、Map 与找回扫描）。
// 存储实现留在 storage，监听协调由 watch 通过窄接口接入。
type Library struct {
	db         *storage.DB
	ingest     *ingestion
	views      viewAssembler
	resources  storage.ResourceStore
	sources    storage.SourceStore
	tags       storage.TagStore
	taggings   storage.TaggingStore
	mapQueries storage.MapStore
	// indexSync 与 previews 只在装配期注入一次（runtime.go），运行期只读，无需加锁。
	indexSync SourceIndexSync
	previews  PendingPreviewStore
	// recovery 拥有找回扫描的会话状态机；扫描算法是本服务的 ScanRecovery。
	recovery *RecoveryScanRunner
}

// NewLibrary 构造核心资源库领域服务，保持领域规则与持久化实现解耦。
func NewLibrary(db *storage.DB, fetcher *remote.Fetcher) *Library {
	lib := &Library{
		db:         db,
		ingest:     newIngestion(db, fetcher),
		views:      viewAssembler{},
		resources:  storage.ResourceStore{},
		sources:    storage.SourceStore{},
		tags:       storage.TagStore{},
		taggings:   storage.TaggingStore{},
		mapQueries: storage.MapStore{},
	}
	lib.recovery = NewRecoveryScanRunner(lib.ScanRecovery)
	return lib
}

// SetIndexSync 注入入口集合的对账回调，使增删改 Resource / Source 后监听集合能异步重建。
func (s *Library) SetIndexSync(h SourceIndexSync) {
	s.indexSync = h
}

// SetPendingPreviews 注入待添加文件短期媒体预览授权存储，由 library.NewRuntime 装配。
func (s *Library) SetPendingPreviews(store PendingPreviewStore) {
	s.previews = store
}

// StartRecoveryScan 启动一次可取消的找回扫描并返回扫描 ID。
func (s *Library) StartRecoveryScan(sourceIDs []string, directory string) (string, error) {
	return s.recovery.Start(sourceIDs, directory)
}

// PollRecoveryScan 取出并消费自上次轮询以来累计的找回候选与进度。
func (s *Library) PollRecoveryScan(scanID string) (RecoveryScanUpdate, error) {
	return s.recovery.Poll(scanID)
}

// CancelRecoveryScan 请求取消指定找回扫描。
func (s *Library) CancelRecoveryScan(scanID string) error {
	return s.recovery.Cancel(scanID)
}

// DiscardRecoveryScan 取消并释放指定找回扫描会话。
func (s *Library) DiscardRecoveryScan(scanID string) {
	s.recovery.Discard(scanID)
}

// ShutdownRecoveryScans 取消并等待全部在途找回扫描退出，由 library.Runtime.Close 唯一驱动。
func (s *Library) ShutdownRecoveryScans() {
	s.recovery.Shutdown()
}

// 入口集合变化后非阻塞地请求监听重建；对账由外部监听协程异步合并执行。
func (s *Library) resyncIndex() {
	if s.indexSync == nil {
		return
	}
	s.indexSync.RequestSync()
}
