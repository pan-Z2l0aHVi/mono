package library

import (
	"context"
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"sync"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/media"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/watch"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

type pendingPreviewAdapter struct {
	registry *media.PendingPreviewRegistry
	urls     media.URLBuilder
}

func (a pendingPreviewAdapter) Register(location string) (string, string, error) {
	token, err := a.registry.Register(location)
	if err != nil {
		return "", "", err
	}
	return token, a.urls.PendingMediaURL(token), nil
}

func (a pendingPreviewAdapter) Release(token string) bool {
	return a.registry.Release(token)
}

// RuntimeOptions 描述构建 library.Runtime 所需的路径与可选依赖。
type RuntimeOptions struct {
	// DataDir 为应用数据目录；未显式指定 DBPath / ThumbnailDir 时自动派生其下的
	// library.db 与 thumbnails 目录。
	DataDir string
	// DBPath 为 SQLite 库文件路径；为空时从 DataDir 派生。
	DBPath string
	// ThumbnailDir 为缩略图缓存目录；为空且 DataDir 非空时从 DataDir 派生。
	ThumbnailDir string
	// Fetcher 为 URL 元数据抓取器；为 nil 时使用默认 remote.NewFetcher()。
	Fetcher *remote.Fetcher
	// EnableLocalMediaServer 在 Windows 端启用独立 127.0.0.1:0 流式媒体 HTTP 服务，
	// 绕开 Wails v3 Windows AssetServer 的全量内存缓冲与 UI 主线程同步拷贝。
	EnableLocalMediaServer bool
	// IsProduction 传递给 LocalServer 决定 CORS Origin 白名单（生产态仅放行 Wails Origin）。
	IsProduction bool
}

// Runtime 统一拥有资源库后端的装配与有序关停：
// 依赖方向单向（library → core / media / watch / storage / remote），
// 持有 DB、core 服务、PendingPreviewRegistry、AvailabilityGate、Watcher、media.Handler 与可选 LocalServer。
//
// 关停排空序固定为：
// watcher → localServer → media/thumbs（含 PendingPreviewRegistry 清空）→ core.ShutdownRecoveryScans() → db.Close()。
// ScheduleBackground 及其排空仍留在 storage.DB.Close() 内部，不外迁。
type Runtime struct {
	db          *storage.DB
	core        *core.Library
	previews    *media.PendingPreviewRegistry
	gate        *watch.AvailabilityGate
	watcher     *watch.Watcher
	thumbs      *media.ThumbnailStore
	media       *media.Handler
	localServer *media.LocalServer
	urlBuilder  media.URLBuilder

	stateMu   sync.Mutex
	started   bool
	closed    bool
	startWg   sync.WaitGroup
	closeOnce sync.Once
	closeErr  error
}

// NewRuntime 打开本地资源库并完成全部核心组件与媒体/监听管线的装配。
// 文件监听或缩略图目录不可用时按降级处理并记日志，不阻塞应用启动。
func NewRuntime(opts RuntimeOptions) (*Runtime, error) {
	dbPath := opts.DBPath
	if dbPath == "" && opts.DataDir != "" {
		dbPath = filepath.Join(opts.DataDir, "library.db")
	}
	if dbPath == "" {
		return nil, errors.New("library runtime requires DataDir or DBPath")
	}

	thumbDir := opts.ThumbnailDir
	if thumbDir == "" && opts.DataDir != "" {
		thumbDir = filepath.Join(opts.DataDir, "thumbnails")
	}

	fetcher := opts.Fetcher
	if fetcher == nil {
		fetcher = remote.NewFetcher()
	}

	db, err := storage.Open(dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database at %s: %w", dbPath, err)
	}

	coreLib := core.NewLibrary(db, fetcher)
	previews := media.NewPendingPreviewRegistry()

	// gate 恒存在：可用性写入口不依赖 fsnotify 是否可用，监听不可用时媒体 404 兜底照常
	// 落库，只降级目录监听方向。事件出口要等 window 就绪才能确定，gate 未接线时只落库
	// 不发事件；SetAvailabilityEmitter 必须在 Start 之前完成。
	gate := watch.NewAvailabilityGate(coreLib)
	watcher, watchErr := watch.NewWatcher(gate)
	if watchErr != nil {
		log.Printf("interweave: file watch unavailable, availability relies on manual refresh: %v", watchErr)
	} else {
		// core 写路径直接经 *watch.Watcher.RequestSync 非阻塞投递对账请求，
		// 前台写入不被 os.ReadDir 阻塞。
		coreLib.SetIndexSync(watcher)
	}

	// 缩略图缓存与库文件同级；目录建不出来只降级缩略图能力（读取一律 404，
	// 前端回退原图），不影响媒体读取与库本身。
	var thumbs *media.ThumbnailStore
	if thumbDir != "" {
		store, err := media.NewThumbnailStore(thumbDir)
		if err != nil {
			log.Printf("interweave: thumbnail cache unavailable: %v", err)
		} else {
			thumbs = store
		}
	}

	mediaHandler := media.NewHandler(storage.SourceStore{}, db.SqlDB(), previews, thumbs, gate)

	var localServer *media.LocalServer
	var urlBuilder media.URLBuilder
	if opts.EnableLocalMediaServer {
		srv, srvErr := media.NewLocalServer(media.LocalServerOptions{
			Handler:      mediaHandler,
			IsProduction: opts.IsProduction,
		})
		if srvErr != nil {
			log.Printf("interweave: local media server unavailable, falling back to AssetServer: %v", srvErr)
		} else {
			localServer = srv
			urlBuilder = srv.URLBuilder()
		}
	}

	coreLib.SetPendingPreviews(pendingPreviewAdapter{registry: previews, urls: urlBuilder})

	return &Runtime{
		db:          db,
		core:        coreLib,
		previews:    previews,
		gate:        gate,
		watcher:     watcher,
		thumbs:      thumbs,
		media:       mediaHandler,
		localServer: localServer,
		urlBuilder:  urlBuilder,
	}, nil
}

// Core 返回核心资源库领域服务，供 Wails 外观层装配。
func (r *Runtime) Core() *core.Library { return r.core }

// MediaHandler 返回挂接在 AssetServer 上的媒体路由处理器。
func (r *Runtime) MediaHandler() *media.Handler { return r.media }

// MediaURLBuilder 返回当前运行时对应的媒体/缩略图 URL 构造器。
func (r *Runtime) MediaURLBuilder() media.URLBuilder { return r.urlBuilder }

// SetPreviewEvictHandler 晚绑定 pending 预览 LRU 驱逐回调。
func (r *Runtime) SetPreviewEvictHandler(handler func(token string)) {
	r.previews.SetEvictHandler(handler)
}

// SetAvailabilityEmitter 晚绑定文件可用性翻转事件出口，须在 Start 之前调用。
func (r *Runtime) SetAvailabilityEmitter(emit watch.Emitter) {
	r.gate.SetEmitter(emit)
}

// Start 幂等启动后台任务：过期缩略图清理、指纹回填与目录监听。
// 若 Runtime 已经启动或已关闭，则为空操作。
func (r *Runtime) Start(ctx context.Context) {
	r.stateMu.Lock()
	if r.started || r.closed {
		r.stateMu.Unlock()
		return
	}
	r.started = true
	r.startWg.Add(1)
	r.stateMu.Unlock()
	defer r.startWg.Done()

	if r.thumbs != nil {
		r.thumbs.StartPrune(func(pruneCtx context.Context) ([]storage.SourceModel, error) {
			return storage.SourceStore{}.ListFileSources(pruneCtx, r.db.SqlDB())
		})
	}
	// 指纹回填是启动期后台补账，不在构造函数里隐藏调度。
	r.db.ScheduleBackground("fingerprint:backfill", r.core.BackfillFingerprints)
	if r.watcher != nil {
		if err := r.watcher.Start(ctx); err != nil {
			log.Printf("interweave: failed to start file watch: %v", err)
		}
	}
}

// Close 幂等且有序地排空并释放资源库全部后台协程与数据库连接：
// watcher → localServer → media/thumbs（含 PendingPreviewRegistry 清空）→ core.ShutdownRecoveryScans() → db.Close()。
func (r *Runtime) Close() error {
	r.closeOnce.Do(func() {
		r.stateMu.Lock()
		r.closed = true
		r.stateMu.Unlock()

		// 1. 先停 watcher（若 Start 正在初始对账也会立即取消），再等待在途 Start 退出。
		if r.watcher != nil {
			r.watcher.Stop()
		}
		r.startWg.Wait()

		// 2. 先排空本地流式媒体服务连接，再排空媒体 404 回写与缩略图构建/清理，并撤销全部 pending 预览授权。
		if r.localServer != nil {
			r.localServer.Close()
		}
		r.media.Close()
		r.previews.Clear()

		// 3. 取消并等待在途找回扫描退出。
		r.core.ShutdownRecoveryScans()

		// 4. 最后关闭数据库（内部会排空 ScheduleBackground 协程）。
		r.closeErr = r.db.Close()
	})
	return r.closeErr
}
