package service

import "testing"

// 事件名是跨进程的线上契约：Go 注册什么名字，生成器就产出什么常量，前端据此订阅。
// 这里逐字钉住，任何一侧改名都会先让这个测试变红。
func TestCustomEventNames(t *testing.T) {
	pairs := []struct {
		name string
		want string
	}{
		{FileDropEventName, "library:files-dropped"},
		{URLDropEventName, "library:urls-dropped"},
		{SourceAvailabilityEventName, "library:source-availability-changed"},
		{PreviewRevokedEventName, "library:previews-revoked"},
	}
	for _, pair := range pairs {
		if pair.name != pair.want {
			t.Errorf("expected event name %q, got %q", pair.want, pair.name)
		}
	}
}
