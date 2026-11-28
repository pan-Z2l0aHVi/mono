package service

// cspell:ignore gsettings

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"os/exec"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestParseWindowsProxyServer(t *testing.T) {
	t.Run("单一形态全协议生效", func(t *testing.T) {
		config := parseWindowsProxyServer("127.0.0.1:7890", "")
		if config.HTTPProxy != "http://127.0.0.1:7890" || config.HTTPSProxy != "http://127.0.0.1:7890" {
			t.Fatalf("unexpected entries: %+v", config)
		}
		if config.BypassLocal || config.NoProxy != "" {
			t.Fatalf("unexpected bypass: %+v", config)
		}
	})

	t.Run("按协议拆分且忽略 socks", func(t *testing.T) {
		config := parseWindowsProxyServer("http=10.0.0.1:8080;https=10.0.0.2:8443;socks=10.0.0.3:1080", "")
		if config.HTTPProxy != "http://10.0.0.1:8080" {
			t.Fatalf("http entry: %+v", config)
		}
		if config.HTTPSProxy != "http://10.0.0.2:8443" {
			t.Fatalf("https entry: %+v", config)
		}
	})

	t.Run("绕过清单按逗号归一以适配 httpproxy", func(t *testing.T) {
		config := parseWindowsProxyServer("proxy.local:8080", "<local>;*.example.com;192.168.0.0/16")
		if !config.BypassLocal {
			t.Fatalf("expected <local> flag: %+v", config)
		}
		if config.NoProxy != ".example.com,192.168.0.0/16" {
			t.Fatalf("unexpected NoProxy %q", config.NoProxy)
		}
	})
}

func TestResolveWindowsProxy(t *testing.T) {
	reader := func() (windowsProxyRaw, error) {
		return windowsProxyRaw{
			Enabled:  1,
			Server:   "127.0.0.1:7890",
			Override: "<local>;*.example.com;192.168.0.0/16",
		}, nil
	}

	reqProxy, _ := http.NewRequest(http.MethodGet, "https://api.github.com/repos", nil)
	got, err := resolveWindowsProxy(reqProxy, reader)
	if err != nil || got == nil || got.String() != "http://127.0.0.1:7890" {
		t.Fatalf("expected proxy for github.com, got (%v, %v)", got, err)
	}

	// 多条绕过项（域名后缀与 CIDR）必须各自生效，验证逗号分隔修复。
	reqSuffix, _ := http.NewRequest(http.MethodGet, "https://sub.example.com/path", nil)
	if got, err := resolveWindowsProxy(reqSuffix, reader); err != nil || got != nil {
		t.Fatalf("expected suffix bypass, got (%v, %v)", got, err)
	}
	reqCIDR, _ := http.NewRequest(http.MethodGet, "http://192.168.1.42/status", nil)
	if got, err := resolveWindowsProxy(reqCIDR, reader); err != nil || got != nil {
		t.Fatalf("expected CIDR bypass, got (%v, %v)", got, err)
	}
	reqLocal, _ := http.NewRequest(http.MethodGet, "http://intranet/docs", nil)
	if got, err := resolveWindowsProxy(reqLocal, reader); err != nil || got != nil {
		t.Fatalf("expected <local> bare-host bypass, got (%v, %v)", got, err)
	}
}

func TestResolveDarwinProxy(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://example.com", nil)

	cases := []struct {
		name string
		raw  string
		want string
	}{
		{
			name: "kCFProxyTypeHTTPS 映射为明文 http 代理避免 TLS-to-proxy EOF",
			raw:  "https|127.0.0.1:7890",
			want: "http://127.0.0.1:7890",
		},
		{
			name: "kCFProxyTypeHTTP 映射为 http 代理",
			raw:  "http|127.0.0.1:7890",
			want: "http://127.0.0.1:7890",
		},
		{
			name: "kCFProxyTypeSOCKS 映射为 socks5 代理",
			raw:  "socks5|127.0.0.1:7891",
			want: "socks5://127.0.0.1:7891",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := resolveDarwinProxy(req, func(string) (string, bool) {
				return tc.raw, true
			})
			if err != nil || got == nil || got.String() != tc.want {
				t.Fatalf("resolveDarwinProxy(%q) = (%v, %v), want %q", tc.raw, got, err, tc.want)
			}
		})
	}

	if got, err := resolveDarwinProxy(req, func(string) (string, bool) { return "", false }); err != nil || got != nil {
		t.Fatalf("expected direct connection, got (%v, %v)", got, err)
	}

	if _, err := resolveDarwinProxy(req, func(string) (string, bool) { return "malformed", true }); err == nil {
		t.Fatalf("expected error for malformed darwin result")
	}

	if _, err := resolveDarwinProxy(req, func(string) (string, bool) { return "ftp|127.0.0.1:2121", true }); err == nil {
		t.Fatalf("expected error for unsupported darwin proxy type")
	}
}

func TestParseGSettingsValue(t *testing.T) {
	cases := map[string]string{
		"'127.0.0.1'": "127.0.0.1",
		"7890":        "7890",
		"''":          "",
		"":            "",
		"@":           "",
	}
	for raw, want := range cases {
		if got := parseGSettingsValue(raw); got != want {
			t.Fatalf("parseGSettingsValue(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestDesktopsOf(t *testing.T) {
	cases := map[string][]string{
		"KDE":               {"KDE"},
		"kde:gnome":         {"KDE", "GNOME"},
		"ubuntu:GNOME":      {"UBUNTU", "GNOME"},
		"X-Cinnamon":        {"X-CINNAMON"},
		"":                  nil,
		"  GNOME  : XFCE  ": {"GNOME", "XFCE"},
	}
	for raw, want := range cases {
		got := desktopsOf(raw)
		if len(got) != len(want) {
			t.Fatalf("desktopsOf(%q) = %v, want %v", raw, got, want)
		}
		for index := range want {
			if got[index] != want[index] {
				t.Fatalf("desktopsOf(%q) = %v, want %v", raw, got, want)
			}
		}
	}
}

func TestLinuxGSettingsProxy(t *testing.T) {
	t.Run("遇 exec.ErrNotFound 永久短路，后续不再读取", func(t *testing.T) {
		now := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
		calls := 0
		proxy := newLinuxGSettingsProxy(
			func(string) string { return "ubuntu:GNOME" },
			func(context.Context, string, string) (string, error) {
				calls++
				return "", exec.ErrNotFound
			},
			func() time.Time { return now },
			5*time.Second,
		)
		req, _ := http.NewRequest(http.MethodGet, "https://example.com", nil)
		if got, err := proxy.Resolve(req); err != nil || got != nil {
			t.Fatalf("unexpected first resolve: (%v, %v)", got, err)
		}
		now = now.Add(10 * time.Minute)
		if got, err := proxy.Resolve(req); err != nil || got != nil {
			t.Fatalf("unexpected second resolve: (%v, %v)", got, err)
		}
		if calls != 1 {
			t.Fatalf("expected single gsettings probe before absent short-circuit, got %d", calls)
		}
	})

	t.Run("已取消的请求上下文直接返回，不触发刷新也不毒化缓存", func(t *testing.T) {
		calls := 0
		proxy := newLinuxGSettingsProxy(
			func(string) string { return "GNOME" },
			func(context.Context, string, string) (string, error) {
				calls++
				return "'manual'", nil
			},
			time.Now,
			5*time.Second,
		)
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://example.com", nil)
		if _, err := proxy.Resolve(req); !errors.Is(err, context.Canceled) {
			t.Fatalf("expected context.Canceled, got %v", err)
		}
		if calls != 0 {
			t.Fatalf("canceled request must not invoke gsettings, got %d calls", calls)
		}
	})

	t.Run("TTL 缓存命中、过期刷新，且超时不毒化既有有效缓存", func(t *testing.T) {
		now := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
		shouldHang := false
		values := map[string]string{
			"org.gnome.system.proxy/mode":       "'manual'",
			"org.gnome.system.proxy.https/host": "'127.0.0.1'",
			"org.gnome.system.proxy.https/port": "7890",
		}
		var calls atomic.Int32
		proxy := newLinuxGSettingsProxy(
			func(string) string { return "GNOME" },
			func(ctx context.Context, schema, key string) (string, error) {
				calls.Add(1)
				if shouldHang {
					<-ctx.Done()
					return "", ctx.Err()
				}
				return values[schema+"/"+key], nil
			},
			func() time.Time { return now },
			5*time.Second,
		)
		proxy.timeout = 40 * time.Millisecond

		req, _ := http.NewRequest(http.MethodGet, "https://example.com", nil)
		got, err := proxy.Resolve(req)
		if err != nil || got == nil || got.String() != "http://127.0.0.1:7890" {
			t.Fatalf("first resolve: (%v, %v)", got, err)
		}
		firstCalls := calls.Load()

		// TTL 内命中缓存，不触发新读取。
		now = now.Add(2 * time.Second)
		got, err = proxy.Resolve(req)
		if err != nil || got == nil || got.String() != "http://127.0.0.1:7890" {
			t.Fatalf("cached resolve: (%v, %v)", got, err)
		}
		if calls.Load() != firstCalls {
			t.Fatalf("expected cache hit without new calls")
		}

		// TTL 过期且 D-Bus 挂起：在 timeout 内返回错误，且不覆写 p.at/p.entries（下次恢复即可刷新）。
		now = now.Add(4 * time.Second)
		shouldHang = true
		start := time.Now()
		if _, err := proxy.Resolve(req); !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("expected deadline exceeded on hung gsettings, got %v", err)
		}
		if elapsed := time.Since(start); elapsed > 500*time.Millisecond {
			t.Fatalf("refresh timeout was not bounded: took %v", elapsed)
		}

		// 紧接着 D-Bus 恢复（未再推进时钟）：不应被上次超时锁死 5 秒，能立即读到新端口。
		shouldHang = false
		values["org.gnome.system.proxy.https/port"] = "7891"
		got, err = proxy.Resolve(req)
		if err != nil || got == nil || got.String() != "http://127.0.0.1:7891" {
			t.Fatalf("recovery resolve after transient timeout: (%v, %v)", got, err)
		}
	})

	t.Run("单键瞬时读取失败时保留既有缓存且不刷新 TTL", func(t *testing.T) {
		now := time.Date(2026, 11, 25, 11, 0, 0, 0, time.UTC)
		failHTTPHost := false
		values := map[string]string{
			"org.gnome.system.proxy/mode":       "'manual'",
			"org.gnome.system.proxy.http/host":  "'127.0.0.1'",
			"org.gnome.system.proxy.http/port":  "7890",
			"org.gnome.system.proxy.https/host": "'127.0.0.1'",
			"org.gnome.system.proxy.https/port": "7891",
		}
		proxy := newLinuxGSettingsProxy(
			func(string) string { return "GNOME" },
			func(_ context.Context, schema, key string) (string, error) {
				if failHTTPHost && schema == "org.gnome.system.proxy.http" && key == "host" {
					return "", errors.New("gsettings transient error")
				}
				return values[schema+"/"+key], nil
			},
			func() time.Time { return now },
			5*time.Second,
		)

		req, _ := http.NewRequest(http.MethodGet, "http://example.com", nil)
		got, err := proxy.Resolve(req)
		if err != nil || got == nil || got.String() != "http://127.0.0.1:7890" {
			t.Fatalf("initial resolve: (%v, %v)", got, err)
		}

		// TTL 过期后，http/host 发生瞬时错误：返回错误且不提交不完整的 next，p.entries 与 p.at 保持不变。
		now = now.Add(6 * time.Second)
		failHTTPHost = true
		if _, err := proxy.Resolve(req); err == nil {
			t.Fatalf("expected error on transient http/host failure")
		}
		if proxy.entries["http"] != (gsettingsEndpoint{host: "127.0.0.1", port: "7890"}) {
			t.Fatalf("existing cache entry was clobbered: %+v", proxy.entries)
		}
		if !proxy.at.Equal(time.Date(2026, 11, 25, 11, 0, 0, 0, time.UTC)) {
			t.Fatalf("cache timestamp should not advance on partial failure: %v", proxy.at)
		}

		// 错误恢复后不推进时钟即可立即刷新拿到最新配置。
		failHTTPHost = false
		values["org.gnome.system.proxy.http/port"] = "7899"
		got, err = proxy.Resolve(req)
		if err != nil || got == nil || got.String() != "http://127.0.0.1:7899" {
			t.Fatalf("recovery resolve after single-key failure: (%v, %v)", got, err)
		}
	})

	t.Run("等锁期间请求取消后直接返回，不触发额外刷新", func(t *testing.T) {
		inRead := make(chan struct{})
		releaseRead := make(chan struct{})
		var modeReads atomic.Int32
		proxy := newLinuxGSettingsProxy(
			func(string) string { return "GNOME" },
			func(_ context.Context, schema, key string) (string, error) {
				if schema == "org.gnome.system.proxy" && key == "mode" {
					if modeReads.Add(1) == 1 {
						close(inRead)
						<-releaseRead
					}
					return "", errors.New("gsettings unavailable")
				}
				return "", nil
			},
			time.Now,
			5*time.Second,
		)

		req1, _ := http.NewRequest(http.MethodGet, "https://example.com", nil)
		done1 := make(chan error, 1)
		go func() {
			_, err := proxy.Resolve(req1)
			done1 <- err
		}()
		<-inRead

		waiting := make(chan struct{})
		proxy.onLockWait = func() {
			close(waiting)
		}

		ctx2, cancel2 := context.WithCancel(context.Background())
		req2, _ := http.NewRequestWithContext(ctx2, http.MethodGet, "https://example.com", nil)
		done2 := make(chan error, 1)
		go func() {
			_, err := proxy.Resolve(req2)
			done2 <- err
		}()

		// 确定性等待 req2 进入等锁态，取消后必须在 req1 释放锁前立即返回 context.Canceled。
		<-waiting
		cancel2()
		select {
		case err := <-done2:
			if !errors.Is(err, context.Canceled) {
				t.Fatalf("expected context.Canceled for waiter, got %v", err)
			}
		case <-time.After(time.Second):
			t.Fatalf("waiter blocked until lock holder finished instead of canceling immediately")
		}
		close(releaseRead)
		<-done1
		if got := modeReads.Load(); got != 1 {
			t.Fatalf("canceled waiter must not trigger second refresh, got %d mode reads", got)
		}
	})

	t.Run("并发解析无数据竞争", func(t *testing.T) {
		proxy := newLinuxGSettingsProxy(
			func(string) string { return "X-Cinnamon" },
			func(_ context.Context, schema, key string) (string, error) {
				switch schema + "/" + key {
				case "org.gnome.system.proxy/mode":
					return "'manual'", nil
				case "org.gnome.system.proxy.https/host":
					return "'127.0.0.1'", nil
				case "org.gnome.system.proxy.https/port":
					return "7890", nil
				default:
					return "''", nil
				}
			},
			time.Now,
			5*time.Second,
		)
		var wg sync.WaitGroup
		for range 12 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				req, _ := http.NewRequest(http.MethodGet, "https://example.com", nil)
				got, err := proxy.Resolve(req)
				if err != nil || got == nil || got.String() != "http://127.0.0.1:7890" {
					t.Errorf("concurrent resolve: (%v, %v)", got, err)
				}
			}()
		}
		wg.Wait()
	})
}

func TestProxyResolverFallback(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "https://example.com", nil)
	envURL, _ := url.Parse("http://env.proxy:8080")
	sysURL, _ := url.Parse("http://sys.proxy:7890")

	t.Run("系统代理命中时优先返回系统代理", func(t *testing.T) {
		r := newProxyResolver(
			func(*http.Request) (*url.URL, error) { return sysURL, nil },
			func(*http.Request) (*url.URL, error) { return envURL, nil },
		)
		got, err := r.Resolve(req)
		if err != nil || got != sysURL {
			t.Fatalf("expected system proxy, got (%v, %v)", got, err)
		}
	})

	t.Run("系统代理返回 nil 或错误时确定性回落环境变量", func(t *testing.T) {
		for _, sys := range []systemProxyLookup{
			func(*http.Request) (*url.URL, error) { return nil, nil },
			func(*http.Request) (*url.URL, error) { return nil, errors.New("unavailable") },
		} {
			r := newProxyResolver(sys, func(*http.Request) (*url.URL, error) { return envURL, nil })
			got, err := r.Resolve(req)
			if err != nil || got != envURL {
				t.Fatalf("expected env fallback, got (%v, %v)", got, err)
			}
		}
	})
}

func TestParseWindowsProxyServerPreservesExistingScheme(t *testing.T) {
	cfg := parseWindowsProxyServer("http://127.0.0.1:7890", "")
	if cfg.HTTPProxy != "http://127.0.0.1:7890" || cfg.HTTPSProxy != "http://127.0.0.1:7890" {
		t.Fatalf("unexpected proxy URLs: %+v", cfg)
	}
	perProto := parseWindowsProxyServer("http=http://127.0.0.1:7890;https=https://127.0.0.1:7891", "")
	if perProto.HTTPProxy != "http://127.0.0.1:7890" || perProto.HTTPSProxy != "https://127.0.0.1:7891" {
		t.Fatalf("unexpected per-protocol proxy URLs: %+v", perProto)
	}
}
