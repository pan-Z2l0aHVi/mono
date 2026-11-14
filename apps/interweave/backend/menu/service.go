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
