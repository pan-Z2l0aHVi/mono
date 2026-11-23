package settings

import (
	"context"
	"fmt"
	"log"
	"sync"
)

// SettingsChangedEventName 是设置变更的推送事件。载荷是变更后的全量快照：
// 前端 store 只做覆盖，不自行合并，也不持有真值。
const SettingsChangedEventName = "settings:changed"

// SettingsPatch 是 UpdateSettings 的入参：只有非 nil 字段参与合并。
//
// 用指针而不是零值判据，是因为 setReducedMotion(false) 与「没提这个字段」必须区分开——
// 布尔零值与不传值无法用值本身表达。
type SettingsPatch struct {
	Appearance            *Appearance `json:"appearance"`
	Accent                *string     `json:"accent"`
	ReducedMotion         *bool       `json:"reducedMotion"`
	DeveloperOptions      *bool       `json:"developerOptions"`
	MinimizeToTrayOnClose *bool       `json:"minimizeToTrayOnClose"`
	Zoom                  *int        `json:"zoom"`
}

// Snapshot 是发给前端的全量设置视图：用户选项加上渲染所需的派生事实。
// AccentPresets 与 ZoomPresets 一并下发，前端只渲染不校验；新增色板或档位不必改前端。
type Snapshot struct {
	Appearance            Appearance `json:"appearance"`
	Accent                string     `json:"accent"`
	ReducedMotion         bool       `json:"reducedMotion"`
	DeveloperOptions      bool       `json:"developerOptions"`
	MinimizeToTrayOnClose bool       `json:"minimizeToTrayOnClose"`
	// Zoom 是界面缩放百分比，取值来自 ZoomPresets。
	Zoom int `json:"zoom"`
	// Warnings 是启动期累积、尚未送达界面的一次性提示（设置文件损坏、字段被修正等）。
	// 首帧之后产生的警告走 SettingsChanged 事件，不在这里重复。
	Warnings    []string       `json:"warnings"`
	Presets     []AccentPreset `json:"presets"`
	Appearances []Appearance   `json:"appearances"`
	// ZoomPresets 是缩放的档位白名单，顺序即 slider 刻度顺序。
	ZoomPresets []ZoomPreset `json:"zoomPresets"`
}

// ChangeListener 在设置变更保存成功后收到最新状态。菜单构建器据此决定是否重建：
// 只有影响菜单可见项的设置才值得重建整棵菜单树。
type ChangeListener func(Settings)

// Service 是设置的 Wails 外观：读快照、合并写入、成功后推送快照。
// 它是 settings 模块里唯一注册为 Wails Service 的类型。
type Service struct {
	mu        sync.Mutex
	settings  Settings
	pending   []string
	store     *Store
	listeners map[uint]ChangeListener
	nextID    uint
	// emit 是事件出口，晚绑定：main.go 在 window 就绪后接线。
	emit func(Snapshot)
}

// NewService 用已加载的设置组装外观。pending 是启动期累积的一次性警告。
func NewService(store *Store, initial Settings, pending []string) *Service {
	return &Service{
		settings:  initial,
		pending:   pending,
		store:     store,
		listeners: make(map[uint]ChangeListener),
	}
}

// SetEmitter 晚绑定事件出口。必须在任何一次 UpdateSettings 之前调用，
// 否则变更只落库不推送。
//
//wails:ignore
func (s *Service) SetEmitter(emit func(Snapshot)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.emit = emit
}

// OnChange 登记变更监听；返回注销函数。监听在保存成功后同步调用，
// 因此调用方不要在监听里再调 UpdateSettings。
//
//wails:ignore
func (s *Service) OnChange(listener ChangeListener) func() {
	s.mu.Lock()
	id := s.nextID
	s.nextID++
	s.listeners[id] = listener
	s.mu.Unlock()
	return func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		delete(s.listeners, id)
	}
}

// GetSettings 返回当前设置快照。启动期累积的一次性警告在这个出口送达一次后清空。
func (s *Service) GetSettings(ctx context.Context) Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snapshotLocked(true)
}

// UpdateSettings 按 patch 合并当前设置，校验后落盘；保存成功才算生效。
// 保存失败时内存状态回滚到保存前的值，并把原因返回给调用方。
func (s *Service) UpdateSettings(ctx context.Context, patch SettingsPatch) (Snapshot, error) {
	return s.update(func(current Settings) Settings {
		if patch.Appearance != nil {
			current.Appearance = *patch.Appearance
		}
		if patch.Accent != nil {
			current.Accent = *patch.Accent
		}
		if patch.ReducedMotion != nil {
			current.ReducedMotion = *patch.ReducedMotion
		}
		if patch.DeveloperOptions != nil {
			current.DeveloperOptions = *patch.DeveloperOptions
		}
		if patch.MinimizeToTrayOnClose != nil {
			current.MinimizeToTrayOnClose = *patch.MinimizeToTrayOnClose
		}
		if patch.Zoom != nil {
			current.Zoom = *patch.Zoom
		}
		return current
	})
}

// update 从持锁读到的当前设置算出下一份，再校验、落盘、提交并扇出。
// 相对改动也走这里：读当前值与提交在同一把锁内，并发两次步进不会从同一个旧值起算。
func (s *Service) update(apply func(Settings) Settings) (Snapshot, error) {
	s.mu.Lock()

	next := apply(s.settings)

	normalized, warnings := next.normalize()
	for _, warning := range warnings {
		log.Printf("interweave: settings rejected part of an update: %s", warning)
	}
	if err := s.store.Save(normalized); err != nil {
		snapshot := s.snapshotLocked(false)
		s.mu.Unlock()
		return snapshot, fmt.Errorf("保存设置失败：%w", err)
	}

	changed := normalized != s.settings
	s.settings = normalized
	if !changed {
		snapshot := s.snapshotLocked(false)
		s.mu.Unlock()
		return snapshot, nil
	}

	snapshot := s.snapshotLocked(false)
	listeners := make([]ChangeListener, 0, len(s.listeners))
	for _, listener := range s.listeners {
		listeners = append(listeners, listener)
	}
	emit := s.emit
	// 监听器与事件出口必须在锁外调用：它们会回读设置（菜单重建要读开发者选项），
	// 持锁调用就是自死锁。状态此时已提交，回读到的必然是这一次的新值。
	s.mu.Unlock()

	for _, listener := range listeners {
		listener(normalized)
	}
	if emit != nil {
		emit(snapshot)
	}
	return snapshot, nil
}

// DeveloperOptionsEnabled 供菜单构建器读取，避免它拿到整份设置的写权限。
//
//wails:ignore
func (s *Service) DeveloperOptionsEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.settings.DeveloperOptions
}

// MinimizeToTrayOnCloseEnabled 供窗口关闭钩子读取，避免它拿到整份设置的写权限。
//
//wails:ignore
func (s *Service) MinimizeToTrayOnCloseEnabled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.settings.MinimizeToTrayOnClose
}

// ZoomIn 把界面缩放调大一档并落盘；已在最大档时不变。
//
//wails:ignore
func (s *Service) ZoomIn(ctx context.Context) (Snapshot, error) {
	return s.stepZoom(1)
}

// ZoomOut 把界面缩放调小一档并落盘；已在最小档时不变。
//
//wails:ignore
func (s *Service) ZoomOut(ctx context.Context) (Snapshot, error) {
	return s.stepZoom(-1)
}

// ZoomReset 把界面缩放恢复到标准档（100%）。
//
//wails:ignore
func (s *Service) ZoomReset(ctx context.Context) (Snapshot, error) {
	zoom := defaultZoom
	return s.UpdateSettings(ctx, SettingsPatch{Zoom: &zoom})
}

func (s *Service) stepZoom(delta int) (Snapshot, error) {
	return s.update(func(current Settings) Settings {
		current.Zoom = nextZoom(current.Zoom, delta)
		return current
	})
}

func (s *Service) snapshotLocked(consumeWarnings bool) Snapshot {
	warnings := s.pending
	if consumeWarnings {
		s.pending = nil
	}
	if warnings == nil {
		warnings = []string{}
	}
	return Snapshot{
		Appearance:            s.settings.Appearance,
		Accent:                s.settings.Accent,
		ReducedMotion:         s.settings.ReducedMotion,
		DeveloperOptions:      s.settings.DeveloperOptions,
		MinimizeToTrayOnClose: s.settings.MinimizeToTrayOnClose,
		Zoom:                  s.settings.Zoom,
		Warnings:              warnings,
		Presets:               AccentPresets(),
		Appearances:           []Appearance{AppearanceLight, AppearanceDark, AppearanceSystem},
		ZoomPresets:           ZoomPresets(),
	}
}
