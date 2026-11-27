//go:build !darwin && !windows

package updater

type noopUI struct{}

// NewPlatformUI 在非 macOS/Windows 平台返回无操作占位适配器。
func NewPlatformUI() UIAdapter {
	return &noopUI{}
}

func (n *noopUI) SetEventHandler(func(UIEvent)) {}
func (n *noopUI) Render(UISnapshot)             {}
func (n *noopUI) Focus()                        {}
func (n *noopUI) Hide()                         {}
func (n *noopUI) Close()                        {}
