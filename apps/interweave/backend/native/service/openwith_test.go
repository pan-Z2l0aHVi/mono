package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultOpenWithRejectsBlankTarget(t *testing.T) {
	if _, err := NewOSService().DefaultOpenWith(context.Background(), " "); err == nil {
		t.Fatal("expected blank target to be rejected")
	}
}

func TestIsHTTPURLCoversLinksAndFilePaths(t *testing.T) {
	cases := map[string]bool{
		"https://example.com":        true,
		"http://example.com/a.png":   true,
		"HTTPS://example.com":        true,
		"/tmp/a.png":                 false,
		`C:\Users\me\a.png`:          false,
		"example.com":                false,
		"file:///tmp/a.png":          false,
		"mailto:someone@example.com": false,
	}
	for target, expected := range cases {
		if actual := isHTTPURL(target); actual != expected {
			t.Errorf("isHTTPURL(%q) = %v, want %v", target, actual, expected)
		}
	}
}

func TestParseDesktopEntryNameIgnoresLocalizedAndOtherSections(t *testing.T) {
	content := `# comment
[Desktop Entry]
Type=Application
Name[zh_CN]=本地化名称
Name=Real Name
Actions=new-window

[Desktop Action new-window]
Name=New Window
`
	if name := parseDesktopEntryName(content); name != "Real Name" {
		t.Fatalf("expected untranslated desktop entry name, got %q", name)
	}
}

func TestDesktopEntryNameReadsXDGApplications(t *testing.T) {
	dir := t.TempDir()
	applications := filepath.Join(dir, "applications")
	if err := os.MkdirAll(applications, 0o700); err != nil {
		t.Fatalf("create applications dir: %v", err)
	}
	desktopFile := filepath.Join(applications, "browser.desktop")
	if err := os.WriteFile(desktopFile, []byte("[Desktop Entry]\nName=Example Browser\n"), 0o600); err != nil {
		t.Fatalf("write desktop file: %v", err)
	}

	if name := desktopEntryName("browser", []string{applications}); name != "Example Browser" {
		t.Fatalf("expected display name from desktop file, got %q", name)
	}
	if name := desktopEntryName("missing", []string{applications}); name != "" {
		t.Fatalf("expected missing desktop file to return empty name, got %q", name)
	}
}

func TestDesktopEntryDirsPutsUserDirectoryFirst(t *testing.T) {
	dirs := desktopEntryDirs("/home/me/.local/share", "/usr/local/share:/usr/share")
	if len(dirs) < 2 {
		t.Fatalf("expected user and system directories, got %v", dirs)
	}
	if dirs[0] != filepath.Join("/home/me/.local/share", "applications") {
		t.Fatalf("expected XDG_DATA_HOME first, got %v", dirs)
	}
	if dirs[len(dirs)-1] != filepath.Join("/usr/share", "applications") {
		t.Fatalf("expected system applications directory last, got %v", dirs)
	}
}
