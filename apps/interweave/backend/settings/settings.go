package settings

import (
	"fmt"
	"math"
)

// Appearance 是主题外观的闭集。system 由 web-ui-theme 自己按 prefers-color-scheme 解析，
// Go 侧不存派生值。
type Appearance string

const (
	AppearanceLight  Appearance = "light"
	AppearanceDark   Appearance = "dark"
	AppearanceSystem Appearance = "system"
)

// AccentPreset 是一个可选强调色。Value 是写进 --wui-color-accent 的字面量，也是持久化的值；
// OnAccent 是压在强调色上的前景色（白或黑），由对比度规则在 Go 侧算定，前端只渲染。
type AccentPreset struct {
	Value    string `json:"value"`
	Label    string `json:"label"`
	OnAccent string `json:"onAccent"`
}

// accentPresets 是强调色白名单。值最终会进 CSS 变量，认不出的字面量一律回落默认色，
// 免得旧版本遗留或手改过的设置文件把任意外部字符串带进内联样式。
var accentPresets = []AccentPreset{
	{Value: "#0071e3", Label: "蓝"},
	{Value: "#a54ca4", Label: "紫"},
	{Value: "#f54096", Label: "粉"},
	{Value: "#ff4b53", Label: "红"},
	{Value: "#ff8616", Label: "橙"},
	{Value: "#ffbe00", Label: "黄"},
	{Value: "#61bf45", Label: "绿"},
	{Value: "#8c8c8c", Label: "灰"},
}

const (
	white = "#ffffff"
	black = "#000000"
	// 低于图标与大号标记的 3:1 对比度时，改用另一侧前景色。
	minAccentForForegroundContrast = 3
)

// defaultAccent 是白名单首项：缺省与非法值都回落到它。
var defaultAccent = accentPresets[0].Value

// AccentPresets 返回强调色白名单的副本，调用方改写返回值不影响包内状态。
func AccentPresets() []AccentPreset {
	presets := make([]AccentPreset, len(accentPresets))
	copy(presets, accentPresets)
	for i := range presets {
		presets[i].OnAccent = onAccentFor(presets[i].Value)
	}
	return presets
}

// onAccentFor 按 Apple 的 prominent-action 模式取前景色：默认白色，白字对比度低于 3:1 时改黑。
// 未知值按默认预设处理，与白名单校验的口径一致。
func onAccentFor(accent string) string {
	color := defaultAccent
	for _, preset := range accentPresets {
		if preset.Value == accent {
			color = preset.Value
			break
		}
	}
	if contrastRatio(white, color) >= minAccentForForegroundContrast {
		return white
	}
	return black
}

func relativeLuminance(hex string) float64 {
	channel := func(offset int) float64 {
		raw := float64(parseHexByte(hex[offset:offset+2])) / 255
		if raw <= 0.04045 {
			return raw / 12.92
		}
		return math.Pow((raw+0.055)/1.055, 2.4)
	}
	return 0.2126*channel(1) + 0.7152*channel(3) + 0.0722*channel(5)
}

func contrastRatio(foreground string, background string) float64 {
	a := relativeLuminance(foreground)
	b := relativeLuminance(background)
	return (math.Max(a, b) + 0.05) / (math.Min(a, b) + 0.05)
}

// parseHexByte 只处理白名单里的 #rrggbb 字面量；无法解析时按 0 处理，不会 panic。
func parseHexByte(pair string) int {
	value := 0
	for _, char := range pair {
		value <<= 4
		switch {
		case char >= '0' && char <= '9':
			value |= int(char - '0')
		case char >= 'a' && char <= 'f':
			value |= int(char-'a') + 10
		case char >= 'A' && char <= 'F':
			value |= int(char-'A') + 10
		}
	}
	return value
}

func isAccentPreset(value string) bool {
	for _, preset := range accentPresets {
		if preset.Value == value {
			return true
		}
	}
	return false
}

// ZoomPreset 是一个界面缩放档位。Value 是百分比，也是持久化的值；Label 是设置里的刻度文案。
// 切片顺序即菜单「放大 / 缩小」的步进方向与 slider 的刻度顺序。
type ZoomPreset struct {
	Value int    `json:"value"`
	Label string `json:"label"`
}

// zoomPresets 是缩放档位白名单。菜单与设置面板都只认这四个值，不放开任意百分比。
var zoomPresets = []ZoomPreset{
	{Value: 90, Label: "全面"},
	{Value: 100, Label: "标准"},
	{Value: 110, Label: "舒适"},
	{Value: 120, Label: "关怀"},
}

// defaultZoom 是标准档：缺省、非法值与「默认缩放」命令都落到它。
const defaultZoom = 100

// ZoomPresets 返回缩放档位的副本，调用方改写返回值不影响包内状态。
func ZoomPresets() []ZoomPreset {
	presets := make([]ZoomPreset, len(zoomPresets))
	copy(presets, zoomPresets)
	return presets
}

func isZoomPreset(value int) bool {
	for _, preset := range zoomPresets {
		if preset.Value == value {
			return true
		}
	}
	return false
}

// nextZoom 从当前档位走 delta 档。到端点时停在端点；current 不在白名单内时从默认档起算。
func nextZoom(current int, delta int) int {
	index := zoomPresetIndex(current)
	if index < 0 {
		index = zoomPresetIndex(defaultZoom)
	}
	index += delta
	if index < 0 {
		index = 0
	}
	if index >= len(zoomPresets) {
		index = len(zoomPresets) - 1
	}
	return zoomPresets[index].Value
}

// zoomPresetIndex 返回档位在 zoomPresets 里的下标，不在白名单内时返回 -1。
func zoomPresetIndex(value int) int {
	for i, preset := range zoomPresets {
		if preset.Value == value {
			return i
		}
	}
	return -1
}

func isAppearance(value Appearance) bool {
	switch value {
	case AppearanceLight, AppearanceDark, AppearanceSystem:
		return true
	}
	return false
}

// Settings 是应用设置的持久化形态。字段名即设置文件的 key，改名等于换 schema。
type Settings struct {
	Appearance       Appearance `json:"appearance"`
	Accent           string     `json:"accent"`
	ReducedMotion    bool       `json:"reducedMotion"`
	DeveloperOptions bool       `json:"developerOptions"`
	// Zoom 是界面缩放的百分比，只能取 zoomPresets 里的值。
	Zoom int `json:"zoom"`
}

// Defaults 返回首次启动（或设置损坏）时的取值。
func Defaults() Settings {
	return Settings{
		Appearance: AppearanceSystem,
		Accent:     defaultAccent,
		Zoom:       defaultZoom,
	}
}

// normalize 把任意来源的取值收敛进白名单，返回被修正的字段说明。
// 逐字段修正是有意的：一个字段被手改成非法值，不该连带清掉其他有效设置。
func (s Settings) normalize() (Settings, []string) {
	var warnings []string
	if !isAppearance(s.Appearance) {
		warnings = append(warnings, fmt.Sprintf("外观设置 %q 不在允许范围内，已回落到 %s", s.Appearance, AppearanceSystem))
		s.Appearance = AppearanceSystem
	}
	if !isAccentPreset(s.Accent) {
		warnings = append(warnings, fmt.Sprintf("强调色 %q 不在色板内，已回落到默认色", s.Accent))
		s.Accent = defaultAccent
	}
	// 0 是设置文件里没有 zoom 键时的零值：按缺省档补齐，不当成用户改坏的值报警告。
	if s.Zoom == 0 {
		s.Zoom = defaultZoom
	} else if !isZoomPreset(s.Zoom) {
		warnings = append(warnings, fmt.Sprintf("界面缩放 %d%% 不在档位内，已回落到 %d%%", s.Zoom, defaultZoom))
		s.Zoom = defaultZoom
	}
	return s, warnings
}
