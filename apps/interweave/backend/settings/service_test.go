package settings

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func newTestService(t *testing.T) (*Service, *Store) {
	t.Helper()
	store, _ := newTestStore(t)
	return NewService(store, Defaults(), nil), store
}

func ptr[T any](value T) *T {
	return &value
}

func TestGetSettingsReturnsNormalizedSnapshot(t *testing.T) {
	service, _ := newTestService(t)

	snapshot := service.GetSettings(context.Background())

	if snapshot.Appearance != AppearanceSystem || snapshot.Accent != defaultAccent {
		t.Fatalf("expected defaults, got %#v", snapshot)
	}
	if len(snapshot.Presets) == 0 {
		t.Fatal("expected the palette to ship with the snapshot")
	}
	if len(snapshot.Appearances) != 3 {
		t.Fatalf("expected three appearances, got %v", snapshot.Appearances)
	}
	if snapshot.Warnings == nil {
		t.Fatal("expected an empty, non-nil warnings slice so the frontend can iterate unconditionally")
	}
}

// 启动期警告只送一次：界面拿到之后再次读取设置不该重复弹同一条提示。
func TestStartupWarningsAreDeliveredOnce(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Defaults(), []string{"设置文件损坏"})

	if got := service.GetSettings(context.Background()); len(got.Warnings) != 1 {
		t.Fatalf("expected the warning on the first read, got %v", got.Warnings)
	}
	if got := service.GetSettings(context.Background()); len(got.Warnings) != 0 {
		t.Fatalf("expected the warning to be consumed, got %v", got.Warnings)
	}
}

func TestUpdateSettingsPersistsAndPushes(t *testing.T) {
	service, store := newTestService(t)
	var pushed []Snapshot
	service.SetEmitter(func(snapshot Snapshot) { pushed = append(pushed, snapshot) })
	var notified []Settings
	service.OnChange(func(next Settings) { notified = append(notified, next) })

	snapshot, err := service.UpdateSettings(context.Background(), SettingsPatch{
		Appearance:       ptr(AppearanceDark),
		DeveloperOptions: ptr(true),
	})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if snapshot.Appearance != AppearanceDark || !snapshot.DeveloperOptions {
		t.Fatalf("unexpected snapshot: %#v", snapshot)
	}
	if len(pushed) != 1 || pushed[0].Appearance != AppearanceDark {
		t.Fatalf("expected exactly one pushed snapshot, got %#v", pushed)
	}
	if len(notified) != 1 || notified[0].Appearance != AppearanceDark {
		t.Fatalf("expected exactly one listener call, got %#v", notified)
	}

	loaded, _ := store.Load()
	if loaded.Appearance != AppearanceDark || !loaded.DeveloperOptions {
		t.Fatalf("expected the change to be persisted, got %#v", loaded)
	}
}

// 指针判据的意义：把布尔设置显式改回 false 必须真的落库，不能被当成「没传这个字段」。
func TestUpdateSettingsClearsBooleanExplicitly(t *testing.T) {
	store, _ := newTestStore(t)
	service := NewService(store, Settings{Appearance: AppearanceSystem, Accent: defaultAccent, ReducedMotion: true}, nil)

	if _, err := service.UpdateSettings(context.Background(), SettingsPatch{ReducedMotion: ptr(false)}); err != nil {
		t.Fatalf("update: %v", err)
	}

	loaded, _ := store.Load()
	if loaded.ReducedMotion {
		t.Fatal("expected reducedMotion to be cleared")
	}
}

// 没有实际变化时既不推送也不通知：菜单不该因为一次空 patch 被重建。
func TestUpdateSettingsWithoutChangeDoesNotNotify(t *testing.T) {
	service, _ := newTestService(t)
	pushed := 0
	service.SetEmitter(func(Snapshot) { pushed++ })
	notified := 0
	service.OnChange(func(Settings) { notified++ })

	if _, err := service.UpdateSettings(context.Background(), SettingsPatch{Appearance: ptr(AppearanceSystem)}); err != nil {
		t.Fatalf("update: %v", err)
	}

	if pushed != 0 || notified != 0 {
		t.Fatalf("expected no fan-out for an unchanged update, got pushed=%d notified=%d", pushed, notified)
	}
}

// 保存失败要回滚内存状态：界面读到的设置必须与磁盘上的最后一份一致，
// 否则用户下次启动会看到设置「自己变回去了」。
func TestUpdateSettingsRollsBackOnSaveFailure(t *testing.T) {
	store, path := newTestStore(t)
	service := NewService(store, Defaults(), nil)
	pushed := 0
	service.SetEmitter(func(Snapshot) { pushed++ })

	// 把目录换成一个普通文件，后续写入必然失败。
	if err := os.RemoveAll(filepath.Dir(path)); err != nil {
		t.Fatalf("remove dir: %v", err)
	}
	if err := os.WriteFile(filepath.Dir(path), []byte("blocker"), 0o600); err != nil {
		t.Fatalf("write blocker: %v", err)
	}

	_, err := service.UpdateSettings(context.Background(), SettingsPatch{Appearance: ptr(AppearanceDark)})
	if err == nil {
		t.Fatal("expected the save to fail")
	}
	if pushed != 0 {
		t.Fatalf("expected no push on failure, got %d", pushed)
	}
	if got := service.GetSettings(context.Background()); got.Appearance != AppearanceSystem {
		t.Fatalf("expected the in-memory state to roll back, got %q", got.Appearance)
	}
}

func TestUpdateSettingsRejectsValueOutsideWhitelist(t *testing.T) {
	service, _ := newTestService(t)

	snapshot, err := service.UpdateSettings(context.Background(), SettingsPatch{Accent: ptr("#123456")})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if snapshot.Accent != defaultAccent {
		t.Fatalf("expected the accent to fall back to the default, got %q", snapshot.Accent)
	}
}

func TestDeveloperOptionsEnabledReflectsState(t *testing.T) {
	service, _ := newTestService(t)

	if service.DeveloperOptionsEnabled() {
		t.Fatal("expected developer options to start disabled")
	}
	if _, err := service.UpdateSettings(context.Background(), SettingsPatch{DeveloperOptions: ptr(true)}); err != nil {
		t.Fatalf("update: %v", err)
	}
	if !service.DeveloperOptionsEnabled() {
		t.Fatal("expected developer options to be enabled")
	}
}

func TestOnChangeUnsubscribe(t *testing.T) {
	service, _ := newTestService(t)
	notified := 0
	unsubscribe := service.OnChange(func(Settings) { notified++ })

	if _, err := service.UpdateSettings(context.Background(), SettingsPatch{ReducedMotion: ptr(true)}); err != nil {
		t.Fatalf("update: %v", err)
	}
	unsubscribe()
	if _, err := service.UpdateSettings(context.Background(), SettingsPatch{ReducedMotion: ptr(false)}); err != nil {
		t.Fatalf("update: %v", err)
	}

	if notified != 1 {
		t.Fatalf("expected one notification before unsubscribing, got %d", notified)
	}
}

/*
 * 菜单重建监听器会在回调里回读设置（要拿开发者选项）；回读若撞上 UpdateSettings 持有的锁，
 * 就是一次自死锁。这条用例把那次回读做进去，并在有限时间内完成——
 * 没有超时机制时它表现为整个测试卡死，因此这里是「跑不完」而不是「断言失败」。
 */
func TestChangeListenerCanReadSettingsBack(t *testing.T) {
	service, _ := newTestService(t)
	// 生产路径的菜单重建就是在这里回读。
	service.OnChange(func(settings Settings) {
		_ = service.DeveloperOptionsEnabled()
	})

	done := make(chan struct{})
	go func() {
		defer close(done)
		if _, err := service.UpdateSettings(context.Background(), SettingsPatch{DeveloperOptions: ptr(true)}); err != nil {
			t.Errorf("update: %v", err)
		}
	}()

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("UpdateSettings deadlocked: the change listener could not read settings back")
	}
}
