package service

import (
	"net/http"
	"net/url"
	"testing"
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

	t.Run("绕过清单归一", func(t *testing.T) {
		config := parseWindowsProxyServer("proxy.local:8080", "<local>;*.example.com;192.168.0.0/16")
		if !config.BypassLocal {
			t.Fatalf("expected <local> flag: %+v", config)
		}
		if config.NoProxy != ".example.com;192.168.0.0/16" {
			t.Fatalf("unexpected NoProxy %q", config.NoProxy)
		}
	})
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

// SystemProxy 在系统未给出代理（显式直连 / PAC / 读取失败）时应回落环境变量。开发机常带真实系统
// 代理（返回非 nil），这种环境下回退不可观测，直接跳过。
func TestSystemProxyFallsBackToEnvironment(t *testing.T) {
	t.Setenv("HTTP_PROXY", "")
	t.Setenv("HTTPS_PROXY", "")
	t.Setenv("http_proxy", "")
	t.Setenv("https_proxy", "")
	request := &http.Request{URL: &url.URL{Scheme: "https", Host: "example.com"}}
	if system, err := systemProxyFor(request); err != nil || system != nil {
		t.Skipf("system proxy is configured (%v, %v); fallback not observable", system, err)
	}
	u, err := SystemProxy(request)
	if err != nil {
		t.Fatalf("SystemProxy returned error: %v", err)
	}
	if u != nil {
		t.Fatalf("expected direct connection, got %v", u)
	}
}
