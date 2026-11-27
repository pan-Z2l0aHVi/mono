package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func newTestStore(t *testing.T) (*Store, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "interweave", "settings.json")
	store, err := NewStore(path)
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	return store, path
}

func TestLoadWithoutFileReturnsDefaults(t *testing.T) {
	store, _ := newTestStore(t)

	loaded, warnings := store.Load()

	if loaded != Defaults() {
		t.Fatalf("expected defaults, got %#v", loaded)
	}
	if len(warnings) != 0 {
		t.Fatalf("expected no warnings on first launch, got %v", warnings)
	}
}

func TestSaveThenLoadRoundTrips(t *testing.T) {
	store, path := newTestStore(t)
	want := Settings{
		Appearance:            AppearanceDark,
		Accent:                "#f54096",
		ReducedMotion:         true,
		MinimizeToTrayOnClose: true,
		Zoom:                  110,
	}

	if err := store.Save(want); err != nil {
		t.Fatalf("save: %v", err)
	}
	loaded, warnings := store.Load()
	if loaded != want {
		t.Fatalf("expected %#v, got %#v", want, loaded)
	}
	if len(warnings) != 0 {
		t.Fatalf("expected no warnings, got %v", warnings)
	}
	if _, err := os.Stat(TempPath(path)); !os.IsNotExist(err) {
		t.Fatalf("expected the temp file to be renamed away, stat err = %v", err)
	}
}

// 设置文件里出现白名单外的值时必须逐字段回落并保留其他有效字段：
// 一个被手改坏的强调色不该顺带清掉用户选的主题。
func TestLoadNormalizesOutOfRangeFields(t *testing.T) {
	store, path := newTestStore(t)
	raw := `{"settings":{"appearance":"dark","accent":"#123456","reducedMotion":true}}`
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	loaded, warnings := store.Load()

	if loaded.Appearance != AppearanceDark {
		t.Fatalf("expected the valid appearance to survive, got %q", loaded.Appearance)
	}
	if loaded.Accent != defaultAccent {
		t.Fatalf("expected the invalid accent to fall back, got %q", loaded.Accent)
	}
	if !loaded.ReducedMotion {
		t.Fatal("expected reducedMotion to survive normalization")
	}
	// 老设置文件没有 zoom 键，零值按缺省档补齐，且不该为此再报一条警告。
	if loaded.Zoom != defaultZoom {
		t.Fatalf("expected a missing zoom to fall back to %d, got %d", defaultZoom, loaded.Zoom)
	}
	if len(warnings) != 1 {
		t.Fatalf("expected exactly one warning, got %v", warnings)
	}
}

// 白名单外的缩放值（例如手改成 95）按字段修正：回落默认档，其余字段不受影响。
func TestLoadNormalizesOutOfRangeZoom(t *testing.T) {
	store, path := newTestStore(t)
	raw := `{"settings":{"appearance":"dark","accent":"#0071e3","reducedMotion":true,"zoom":95}}`
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	loaded, warnings := store.Load()

	if loaded.Zoom != defaultZoom {
		t.Fatalf("expected zoom to fall back to %d, got %d", defaultZoom, loaded.Zoom)
	}
	if !loaded.ReducedMotion || loaded.Appearance != AppearanceDark {
		t.Fatalf("expected the valid fields to survive, got %#v", loaded)
	}
	if len(warnings) != 1 {
		t.Fatalf("expected one warning for the zoom fallback, got %v", warnings)
	}
}

func TestLoadCorruptedFileFallsBackWithWarning(t *testing.T) {
	store, path := newTestStore(t)
	if err := os.WriteFile(path, []byte("{not json"), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	loaded, warnings := store.Load()

	if loaded != Defaults() {
		t.Fatalf("expected defaults, got %#v", loaded)
	}
	if len(warnings) != 1 {
		t.Fatalf("expected a warning explaining the fallback, got %v", warnings)
	}
}

func TestLoadIgnoresEmptyObject(t *testing.T) {
	store, path := newTestStore(t)
	if err := os.WriteFile(path, []byte(`{"settings":{}}`), 0o600); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	loaded, warnings := store.Load()

	if loaded != Defaults() {
		t.Fatalf("expected an empty object to read as defaults, got %#v", loaded)
	}
	if len(warnings) != 0 {
		t.Fatalf("expected no warnings for an unsaved store, got %v", warnings)
	}
}

func TestSaveWritesSingleKeyJSON(t *testing.T) {
	store, path := newTestStore(t)
	if err := store.Save(Defaults()); err != nil {
		t.Fatalf("save: %v", err)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read settings file: %v", err)
	}
	var decoded map[string]json.RawMessage
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("decode settings file: %v", err)
	}
	if len(decoded) != 1 {
		t.Fatalf("expected exactly one key in the store, got %d: %s", len(decoded), raw)
	}
	if _, ok := decoded[settingsKey]; !ok {
		t.Fatalf("expected the %q key, got %s", settingsKey, raw)
	}
}

func TestRemoveStaleTempClearsLeftover(t *testing.T) {
	_, path := newTestStore(t)
	if err := os.WriteFile(TempPath(path), []byte("partial"), 0o600); err != nil {
		t.Fatalf("write temp fixture: %v", err)
	}

	RemoveStaleTemp(path)

	if _, err := os.Stat(TempPath(path)); !os.IsNotExist(err) {
		t.Fatalf("expected the stale temp file to be removed, stat err = %v", err)
	}
}

// 清理必须接在生产路径上：NewStore 建好目录后顺手清掉上次异常退出留下的中转文件。
func TestNewStoreClearsLeftoverTemp(t *testing.T) {
	path := filepath.Join(t.TempDir(), "interweave", "settings.json")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("create settings directory: %v", err)
	}
	if err := os.WriteFile(TempPath(path), []byte("partial"), 0o600); err != nil {
		t.Fatalf("write temp fixture: %v", err)
	}

	if _, err := NewStore(path); err != nil {
		t.Fatalf("new store: %v", err)
	}

	if _, err := os.Stat(TempPath(path)); !os.IsNotExist(err) {
		t.Fatalf("expected NewStore to clear the stale temp file, stat err = %v", err)
	}
}

func TestAccentPresetsExposeForeground(t *testing.T) {
	presets := AccentPresets()
	if len(presets) == 0 {
		t.Fatal("expected a non-empty palette")
	}
	for _, preset := range presets {
		if preset.OnAccent != white && preset.OnAccent != black {
			t.Fatalf("preset %s has an unexpected foreground %q", preset.Value, preset.OnAccent)
		}
		if ratio := contrastRatio(preset.OnAccent, preset.Value); ratio < minAccentForForegroundContrast {
			t.Fatalf("preset %s with %s only reaches %.2f:1", preset.Value, preset.OnAccent, ratio)
		}
	}
}

// 取副本而不是内部切片：调用方改写返回值不该影响下次下发。
func TestAccentPresetsAreCopied(t *testing.T) {
	presets := AccentPresets()
	original := presets[0].Value
	presets[0].Value = "#000000"

	if AccentPresets()[0].Value != original {
		t.Fatal("expected AccentPresets to hand out a copy")
	}
}
