package media

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	localServerReadHeaderTimeout = 5 * time.Second
	localServerIdleTimeout       = 60 * time.Second
	localServerShutdownTimeout   = 300 * time.Millisecond
	localServerDrainTimeout      = 1500 * time.Millisecond
	sessionTokenBytes            = 32
	sessionPathPrefix            = "/s/"
)

// LocalServerOptions 配置仅监听本机回环地址的流式媒体 HTTP 服务。
type LocalServerOptions struct {
	// Handler 是承载 /resource-media/、/pending-resource-media/、/resource-thumbnail/ 的核心处理器。
	Handler http.Handler
	// IsProduction 决定 CORS Origin 白名单：生产态仅放行 Wails 应用自身 Origin（且端口为空），
	// 开发态额外放行 localhost 与 127.0.0.1。
	IsProduction bool
	// Logger 可选诊断日志函数；为空时默认使用 log.Printf。
	Logger func(format string, args ...any)
}

// LocalServer 通过 Go 原生 net/http 在 127.0.0.1:0 提供真正的 TCP 流式 Range 响应，
// 用于在 Windows 端绕开 Wails v3 AssetServer 的全量内存缓冲与 UI 主线程同步拷贝。
//
// 生命周期归属 library.Runtime，不注册为 Wails Service。
// 关闭时通过 closingMu + closing 门控避免 activeHandlers.Add(1) 与 Wait() 的并发竞态。
type LocalServer struct {
	server       *http.Server
	listener     net.Listener
	sessionToken string
	baseURL      string
	isProduction bool
	logf         func(format string, args ...any)

	cancelBase     context.CancelFunc
	closingMu      sync.RWMutex
	closing        bool
	activeHandlers sync.WaitGroup
	closeOnce      sync.Once
}

// NewLocalServer 启动监听 127.0.0.1:0 的本地流式媒体服务。
func NewLocalServer(opts LocalServerOptions) (*LocalServer, error) {
	if opts.Handler == nil {
		return nil, errors.New("media local server requires non-nil handler")
	}
	token, err := generateSessionToken()
	if err != nil {
		return nil, fmt.Errorf("generate media session token: %w", err)
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("listen local media server: %w", err)
	}

	logf := opts.Logger
	if logf == nil {
		logf = log.Printf
	}
	baseCtx, cancelBase := context.WithCancel(context.Background())

	s := &LocalServer{
		listener:     ln,
		sessionToken: token,
		baseURL:      fmt.Sprintf("http://%s%s%s", ln.Addr().String(), sessionPathPrefix, token),
		isProduction: opts.IsProduction,
		logf:         logf,
		cancelBase:   cancelBase,
	}

	s.server = &http.Server{
		Handler:           s.buildHandler(opts.Handler),
		ReadHeaderTimeout: localServerReadHeaderTimeout,
		IdleTimeout:       localServerIdleTimeout,
		BaseContext: func(net.Listener) context.Context {
			return baseCtx
		},
	}

	go func() {
		if err := s.server.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			s.logf("interweave: local media server exited unexpectedly: %v", err)
		}
	}()

	return s, nil
}

// BaseURL 返回带随机 sessionToken 前缀的服务基址（不含尾斜杠）。
func (s *LocalServer) BaseURL() string {
	return s.baseURL
}

// URLBuilder 返回指向当前 LocalServer 的媒体 URL 构造器。
func (s *LocalServer) URLBuilder() URLBuilder {
	return NewURLBuilder(s.baseURL)
}

// RedactURL 将日志或错误信息中的 /s/<sessionToken>/ 替换为脱敏占位符。
func (s *LocalServer) RedactURL(raw string) string {
	if s == nil || s.sessionToken == "" {
		return raw
	}
	return strings.ReplaceAll(raw, sessionPathPrefix+s.sessionToken+"/", sessionPathPrefix+"[redacted]/")
}

// Close 幂等且有界地关停本地媒体服务：
// 1. 置 closing 门控拒绝新请求（避免 activeHandlers.Add 与 Wait 并发竞态）；
// 2. 取消 BaseContext；
// 3. 300ms 短超时 Shutdown 排空短请求；
// 4. 超时或出错则显式 Close() 强断残留视频流连接；
// 5. 带 1.5s 兜底超时等待在途 handler 退出。
func (s *LocalServer) Close() {
	s.closeOnce.Do(func() {
		s.closingMu.Lock()
		s.closing = true
		s.closingMu.Unlock()

		s.cancelBase()

		shutdownCtx, cancel := context.WithTimeout(context.Background(), localServerShutdownTimeout)
		err := s.server.Shutdown(shutdownCtx)
		cancel()
		if err != nil {
			_ = s.server.Close()
		}

		drained := make(chan struct{})
		go func() {
			s.activeHandlers.Wait()
			close(drained)
		}()
		timer := time.NewTimer(localServerDrainTimeout)
		defer timer.Stop()
		select {
		case <-drained:
		case <-timer.C:
			s.logf("interweave: local media server drain timed out after %s", localServerDrainTimeout)
		}
	})
}

func (s *LocalServer) buildHandler(inner http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.closingMu.RLock()
		if s.closing {
			s.closingMu.RUnlock()
			w.Header().Set("Vary", "Origin")
			http.Error(w, http.StatusText(http.StatusServiceUnavailable), http.StatusServiceUnavailable)
			return
		}
		s.activeHandlers.Add(1)
		s.closingMu.RUnlock()
		defer s.activeHandlers.Done()

		// CORS 中间件位于最外层（覆盖 200/206/304/403/404/405）且无条件附带 Vary: Origin，
		// 防止无 crossorigin 与 crossorigin="anonymous" 请求混用缓存导致 CORS 投毒。
		w.Header().Set("Vary", "Origin")

		if origin := r.Header.Get("Origin"); origin != "" {
			if !isAllowedLocalOrigin(origin, s.isProduction) {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Range, If-None-Match, If-Range, If-Modified-Since")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, ETag")
			w.Header().Set("Access-Control-Max-Age", "600")
			if strings.EqualFold(r.Header.Get("Access-Control-Request-Private-Network"), "true") {
				w.Header().Set("Access-Control-Allow-Private-Network", "true")
			}
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		strippedPath, ok := s.stripValidatedToken(r.URL.Path)
		if !ok {
			http.NotFound(w, r)
			return
		}

		cloned := r.Clone(r.Context())
		cloned.URL.Path = strippedPath
		cloned.URL.RawPath = ""
		inner.ServeHTTP(w, cloned)
	})
}

func (s *LocalServer) stripValidatedToken(path string) (string, bool) {
	if !strings.HasPrefix(path, sessionPathPrefix) {
		return "", false
	}
	rest := strings.TrimPrefix(path, sessionPathPrefix)
	slash := strings.IndexByte(rest, '/')
	if slash <= 0 {
		return "", false
	}
	gotToken := rest[:slash]
	if len(gotToken) != len(s.sessionToken) ||
		subtle.ConstantTimeCompare([]byte(gotToken), []byte(s.sessionToken)) != 1 {
		return "", false
	}
	return rest[slash:], true
}

func isAllowedLocalOrigin(origin string, isProduction bool) bool {
	u, err := url.Parse(origin)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return false
	}
	if u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
		return false
	}
	scheme := strings.ToLower(u.Scheme)
	host := strings.ToLower(u.Hostname())
	port := u.Port()

	// Wails Windows WebView2 生产与开发都运行在 http://wails.localhost（或 https）。
	if (scheme == "http" || scheme == "https") && host == "wails.localhost" && port == "" {
		return true
	}
	if !isProduction && scheme == "http" && (host == "localhost" || host == "127.0.0.1") {
		return true
	}
	return false
}

func generateSessionToken() (string, error) {
	var raw [sessionTokenBytes]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw[:]), nil
}
