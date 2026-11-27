package menu

import (
	"context"
	"log"
	"sync"
)

// MenuState 是前端向 Go 上报的菜单可用性。Disabled 是「当前不可用」的命令集合；
// 菜单构建时据此把对应项置灰，而不是把它们从菜单里拿掉——用户仍能看到能力存在，
// 只是当前不适用。
type MenuState struct {
	Disabled []Command `json:"disabled"`
}

// Service 是菜单可用性的 Wails 外观：前端上报禁用集合，菜单构建器读它。
//
// 它不落盘、不跨会话：禁用集合是菜单的呈现状态，不是用户设置，所以不属于 settings。
// 上报后触发 menuChanged，由 main.go 重建整棵菜单。
type Service struct {
	mu       sync.Mutex
	disabled map[Command]struct{}
	// changed 是重建触发器，晚绑定：main.go 在 window 就绪后接线。
	changed func()
	// treeProvider 返回当前平台物化后的菜单快照，供 Windows 一体化顶栏读取。
	treeProvider func() []MenuItem
	// invokeHandler 执行来自前端自定义顶栏的菜单点击（command 或系统 role）。
	invokeHandler func(command Command, role string)
}

// NewService 建一个全部命令可用的菜单状态。
func NewService() *Service {
	return &Service{disabled: make(map[Command]struct{})}
}

// SetChangeHandler 晚绑定重建触发器，在首次 ReportDisabledCommands 之前调用。
//
//wails:ignore
func (s *Service) SetChangeHandler(handler func()) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.changed = handler
}

// SetTreeProvider 晚绑定菜单树快照生成器，供自定义顶栏首次加载与测试读取。
//
//wails:ignore
func (s *Service) SetTreeProvider(provider func() []MenuItem) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.treeProvider = provider
}

// SetInvokeHandler 晚绑定自定义顶栏的菜单执行出口。
//
//wails:ignore
func (s *Service) SetInvokeHandler(handler func(command Command, role string)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.invokeHandler = handler
}

// GetMenu 返回当前菜单树快照（含禁用态），供 Windows 一体化顶栏渲染。
func (s *Service) GetMenu(ctx context.Context) []MenuItem {
	if err := ctx.Err(); err != nil {
		return []MenuItem{}
	}
	s.mu.Lock()
	provider := s.treeProvider
	s.mu.Unlock()
	if provider == nil {
		return []MenuItem{}
	}
	items := provider()
	if items == nil {
		return []MenuItem{}
	}
	return items
}

// InvokeMenuItem 触发自定义顶栏中的一个菜单项（业务命令或系统角色）。
// 业务命令若当前处于禁用集合则静默忽略，防止前端旧快照误触。
func (s *Service) InvokeMenuItem(ctx context.Context, command Command, role string) {
	if err := ctx.Err(); err != nil {
		return
	}
	if command != "" {
		if !IsCommand(string(command)) {
			log.Printf("interweave: menu service ignored unknown command %q", command)
			return
		}
		if s.IsDisabled(command) {
			return
		}
	}
	s.mu.Lock()
	handler := s.invokeHandler
	s.mu.Unlock()
	if handler != nil {
		handler(command, role)
	}
}

// ReportDisabledCommands 记录当前的禁用集合；集合真的变了才触发重建。
//
// 前端会在路由与历史栈变化时上报，这些变化可能很频繁，而重建整棵菜单在 Windows 上
// 是一次 SetMenu + DrawMenuBar。去重因此放在 Go 侧兜底：即使前端漏了去重，也不会
// 因同一集合反复重建。
func (s *Service) ReportDisabledCommands(ctx context.Context, disabled []Command) {
	if err := ctx.Err(); err != nil {
		return
	}
	next := make(map[Command]struct{}, len(disabled))
	for _, command := range disabled {
		if !IsCommand(string(command)) {
			log.Printf("interweave: menu service ignored unknown command %q", command)
			continue
		}
		next[command] = struct{}{}
	}

	s.mu.Lock()
	if sameCommandSet(s.disabled, next) {
		s.mu.Unlock()
		return
	}
	s.disabled = next
	changed := s.changed
	// 触发器在锁外调用：它会重建菜单并回读本 Service，持锁回调就是自死锁。
	s.mu.Unlock()

	if changed != nil {
		changed()
	}
}

// DisabledCommands 供菜单构建器读取当前禁用集合。
//
//wails:ignore
func (s *Service) DisabledCommands() []Command {
	s.mu.Lock()
	defer s.mu.Unlock()
	result := make([]Command, 0, len(s.disabled))
	for command := range s.disabled {
		result = append(result, command)
	}
	return result
}

// IsDisabled 供菜单构建器逐项查询。集合来自前端上报，未知命令不会进入集合。
//
//wails:ignore
func (s *Service) IsDisabled(command Command) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, disabled := s.disabled[command]
	return disabled
}

func sameCommandSet(left, right map[Command]struct{}) bool {
	if len(left) != len(right) {
		return false
	}
	for command := range left {
		if _, ok := right[command]; !ok {
			return false
		}
	}
	return true
}
