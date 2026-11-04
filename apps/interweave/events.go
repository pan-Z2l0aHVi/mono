package main

import (
	"github.com/wailsapp/wails/v3/pkg/application"

	libraryService "github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service"
)

// 事件名与载荷类型在此登记一次：绑定生成器据此产出 frontend/bindings/events
// 的常量与类型，前端订阅时引用生成物而不是重复字面量。
func init() {
	application.RegisterEvent[[]string](libraryService.FileDropEventName)
	application.RegisterEvent[application.Void](libraryService.PasteFilesRequestEventName)
	application.RegisterEvent[libraryService.SourceAvailabilityEventDTO](libraryService.SourceAvailabilityEventName)
}
