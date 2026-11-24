package core

import (
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

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
	// indexSync 只在装配期注入一次（runtime.go），运行期只读，无需加锁。
	indexSync SourceIndexSync
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

// 入口集合变化后非阻塞地请求监听重建；对账由外部监听协程异步合并执行。
func (s *Library) resyncIndex() {
	if s.indexSync == nil {
		return
	}
	s.indexSync.RequestSync()
}
