package storage

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"slices"
	"testing"
)

// 颜色表必须由 initSchema 建出来，而不是等业务路径顺带创建：
// 读路径（建议、视图装配）先于任何写入执行，表不存在时首屏就会整页报错。
func TestInitSchemaCreatesTagColorsTable(t *testing.T) {
	db := openStoreTestDB(t)

	var name string
	err := db.SqlDB().QueryRowContext(context.Background(), `
		SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tag_colors'
	`).Scan(&name)
	if errors.Is(err, sql.ErrNoRows) {
		t.Fatal("expected initSchema to create tag_colors, but the table is absent")
	}
	if err != nil {
		t.Fatalf("query sqlite_master: %v", err)
	}
}

// 模拟存量库：tags 里已有标签，tag_colors 表不存在（颜色机制引入前的形态）。
// 重新 Open 必须把表建回来、给全部存量标签补色，且不改动 tags 本身。
func TestBackfillTagColorsFillsLegacyDatabase(t *testing.T) {
	ctx := context.Background()
	db, path := openStoreTestDBAtPath(t)
	seedStoreTag(t, db, "legacy-a")
	seedStoreTag(t, db, "legacy-b")
	dropTagColorsTable(t, db)

	reopened, err := Open(path)
	if err != nil {
		t.Fatalf("reopen legacy database: %v", err)
	}
	t.Cleanup(func() { _ = reopened.Close() })

	for _, name := range []string{"legacy-a", "legacy-b"} {
		tag, err := (TagStore{}).GetByName(ctx, reopened.SqlDB(), name)
		if err != nil {
			t.Fatalf("GetByName(%q) after backfill: %v", name, err)
		}
		if !isKnownTagColor(tag.Color) {
			t.Errorf("expected legacy tag %q to get a known color, got %q", name, tag.Color)
		}
	}

	var createdAt int64
	if err := reopened.SqlDB().QueryRowContext(ctx, `
		SELECT created_at FROM tags WHERE name = 'legacy-a'
	`).Scan(&createdAt); err != nil {
		t.Fatalf("read back seeded tag: %v", err)
	}
	if createdAt != legacyTagCreatedAt {
		t.Errorf("expected backfill to leave tags.created_at at %d, got %d", legacyTagCreatedAt, createdAt)
	}
}

// 补色必须幂等：第二次启动不能重掷已确定的颜色，否则每次开应用标签都会变色。
func TestBackfillTagColorsIsIdempotent(t *testing.T) {
	ctx := context.Background()
	db, path := openStoreTestDBAtPath(t)
	seedStoreTag(t, db, "stable")
	dropTagColorsTable(t, db)

	first, err := Open(path)
	if err != nil {
		t.Fatalf("first reopen: %v", err)
	}
	before, err := (TagStore{}).GetByName(ctx, first.SqlDB(), "stable")
	if err != nil {
		t.Fatalf("GetByName after first backfill: %v", err)
	}
	if err := first.Close(); err != nil {
		t.Fatalf("close first reopen: %v", err)
	}

	second, err := Open(path)
	if err != nil {
		t.Fatalf("second reopen: %v", err)
	}
	t.Cleanup(func() { _ = second.Close() })
	after, err := (TagStore{}).GetByName(ctx, second.SqlDB(), "stable")
	if err != nil {
		t.Fatalf("GetByName after second backfill: %v", err)
	}
	if after.Color != before.Color {
		t.Errorf("expected backfilled color to survive restarts, got %q then %q", before.Color, after.Color)
	}
}

// EnsureColor 只补不写：颜色一经确定就固定下来，覆盖会让已确定颜色的标签改色。
func TestEnsureColorKeepsExistingColor(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	tags := TagStore{}
	seedStoreTag(t, db, "pinned")

	if err := tags.EnsureColor(ctx, db.SqlDB(), "pinned", TagColorBlue); err != nil {
		t.Fatalf("first EnsureColor: %v", err)
	}
	if err := tags.EnsureColor(ctx, db.SqlDB(), "pinned", TagColorRed); err != nil {
		t.Fatalf("second EnsureColor: %v", err)
	}

	tag, err := tags.GetByName(ctx, db.SqlDB(), "pinned")
	if err != nil {
		t.Fatalf("GetByName: %v", err)
	}
	if tag.Color != TagColorBlue {
		t.Errorf("expected existing color to be preserved, got %q", tag.Color)
	}
}

// 混合状态是升级过程的真实中间态：一部分标签已着色、一部分还没有。
// 补色只能动缺的那些——动到已着色的就等于让老标签改色。
func TestBackfillTagColorsKeepsAlreadyColoredTags(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	seedStoreTag(t, db, "colored")
	seedStoreTag(t, db, "colorless")
	tags := TagStore{}
	// 直接摆出混合状态：走 Open 会先触发一次补色，两个标签都会被填上，混不出来。
	if err := tags.EnsureColor(ctx, db.SqlDB(), "colored", TagColorRed); err != nil {
		t.Fatalf("EnsureColor: %v", err)
	}
	if err := tags.BackfillTagColors(ctx, db.SqlDB()); err != nil {
		t.Fatalf("BackfillTagColors: %v", err)
	}

	colored, err := tags.GetByName(ctx, db.SqlDB(), "colored")
	if err != nil {
		t.Fatalf("GetByName(colored): %v", err)
	}
	if colored.Color != TagColorRed {
		t.Errorf("expected backfill to leave the colored tag at %q, got %q", TagColorRed, colored.Color)
	}
	colorless, err := tags.GetByName(ctx, db.SqlDB(), "colorless")
	if err != nil {
		t.Fatalf("GetByName(colorless): %v", err)
	}
	if !isKnownTagColor(colorless.Color) {
		t.Errorf("expected the colorless tag to be backfilled, got %q", colorless.Color)
	}
}

// 缺颜色行的标签必须能正常读出，而不是让扫描失败拖垮整页列表。
func TestGetByNameToleratesMissingColorRow(t *testing.T) {
	ctx := context.Background()
	db := openStoreTestDB(t)
	seedStoreTag(t, db, "colorless")

	tag, err := (TagStore{}).GetByName(ctx, db.SqlDB(), "colorless")
	if err != nil {
		t.Fatalf("GetByName on colorless tag: %v", err)
	}
	if tag.Color != "" {
		t.Errorf("expected empty color for a tag without a color row, got %q", tag.Color)
	}
}

// 随机取色必须落在闭集词汇内，否则前端会拿到映射表里不存在的 key。
func TestRandomTagColorStaysInVocabulary(t *testing.T) {
	seen := make(map[TagColor]bool, len(TagColors))
	for range 200 {
		color := RandomTagColor()
		if !isKnownTagColor(color) {
			t.Fatalf("RandomTagColor produced %q, which is outside TagColors", color)
		}
		seen[color] = true
	}
	// 200 次抽取却只落在一两个 key 上，说明取色没有真正覆盖闭集。
	if len(seen) < 2 {
		t.Errorf("expected colors to spread across the vocabulary, got only %d distinct values", len(seen))
	}
}

// 灰色不进随机池：它在原硬编码表里是归档、草稿这类静态概念的语义信号，
// 随机分配会让设计、紧急这类标签看起来像归档。DTO 边界归一与存量无色行
// 仍然要落到它，所以这里断言的是「不被随机抽到」，不是「不存在」。
func TestRandomTagColorNeverPicksGray(t *testing.T) {
	for range 1000 {
		if color := RandomTagColor(); color == TagColorGray {
			t.Fatalf("RandomTagColor produced %q, but gray is reserved for fallback and backfill", color)
		}
	}
	if slices.Contains(TagColors, TagColorGray) {
		t.Errorf("TagColors must not contain %q, it is reserved rather than randomly assigned", TagColorGray)
	}
}

const legacyTagCreatedAt = int64(1700000000000)

func openStoreTestDBAtPath(t *testing.T) (*DB, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "legacy.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db, path
}

func seedStoreTag(t *testing.T, db *DB, name string) {
	t.Helper()
	err := (TagStore{}).Insert(context.Background(), db.SqlDB(), TagModel{
		ID: "tag-" + name, Name: name, CreatedAt: legacyTagCreatedAt,
	})
	if err != nil {
		t.Fatalf("insert tag %q: %v", name, err)
	}
}

func dropTagColorsTable(t *testing.T, db *DB) {
	t.Helper()
	if _, err := db.SqlDB().Exec(`DROP TABLE IF EXISTS tag_colors`); err != nil {
		t.Fatalf("drop tag_colors: %v", err)
	}
}

func isKnownTagColor(color TagColor) bool {
	return slices.Contains(TagColors, color)
}
