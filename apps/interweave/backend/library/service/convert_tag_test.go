package service

import (
	"slices"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/core"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
)

// 空色不是闭集成员，直接透传会让前端拿到一个既无底色也无文字色的 chip。
func TestTagToDTONormalizesEmptyColor(t *testing.T) {
	tag := core.Tag{ID: "tag-1", Name: "Tokyo"}

	dto := tagToDTO(tag)
	// 这里要钉的是 TagColor 的类型词汇（前端映射表的 14 个键），
	// 不是 storage.TagColors 那个随机池——灰色已退出随机池，
	// 但它仍是归一的确定落点，拿随机池当闭集会把正确的兜底判成越界。
	if !slices.Contains(tagColorVocabulary, dto.Color) {
		t.Errorf("expected DTO color within the closed vocabulary, got %q", dto.Color)
	}
	if dto.Color != storage.TagColorGray {
		t.Errorf("expected empty color to fall back to %q, got %q", storage.TagColorGray, dto.Color)
	}

	// 兜底必须是确定性的：随机会让无色标签每读一次跳一次色。
	if again := tagToDTO(tag); again.Color != dto.Color {
		t.Errorf("expected deterministic fallback, got %q then %q", dto.Color, again.Color)
	}
}

// 归一只兜底缺色，不许改写已确定颜色。
func TestTagToDTOPreservesPersistedColor(t *testing.T) {
	dto := tagToDTO(core.Tag{ID: "tag-1", Name: "Tokyo", Color: storage.TagColorTeal})
	if dto.Color != storage.TagColorTeal {
		t.Errorf("expected persisted color to pass through, got %q", dto.Color)
	}
}

// TagColor 的全部合法取值，与前端 presentation.ts 的穷尽映射一一对应。
// 后端新增颜色而这里没登记，会让「颜色是合法 key」这条断言失去意义。
var tagColorVocabulary = []storage.TagColor{
	"",
	storage.TagColorBlue,
	storage.TagColorEmerald,
	storage.TagColorTeal,
	storage.TagColorCyan,
	storage.TagColorSky,
	storage.TagColorIndigo,
	storage.TagColorViolet,
	storage.TagColorPurple,
	storage.TagColorPink,
	storage.TagColorRed,
	storage.TagColorOrange,
	storage.TagColorAmber,
	storage.TagColorYellow,
	storage.TagColorGray,
}
