package core

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage"
	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/remote"
)

// 文件夹导入的性能基准：walker 规模与逐项重复检查（入队链每文件一次索引查询）。
// 夹具（10 万文件树 / 2000 条存量库）生成成本高，默认跳过；IW_BENCH=1 时才构建并运行。

const (
	benchFlatFiles   = 10_000
	benchNestedFiles = 90_000
	benchNestedDirs  = 100
	benchSeedSources = 2_000
	benchLookupBatch = 500
)

var (
	benchOnce    sync.Once
	benchTreeDir string
	benchTreeErr error
	benchDBOnce  sync.Once
	benchDB      *storage.DB
	benchDBDir   string
	benchDBErr   error
)

// buildBenchTree 一次构建 10 万文件树：1 万个平铺 + 9 万个分散在 100 个子目录里，
// 另带隐藏目录、隐藏文件与符号链接各若干，供 walker 热路径与跳过分支同场测量。
func buildBenchTree() (string, error) {
	benchOnce.Do(func() {
		dir, err := os.MkdirTemp("", "iw-bench-tree-*")
		if err != nil {
			benchTreeErr = err
			return
		}
		benchTreeDir = dir
		payload := []byte("x")
		for i := range benchFlatFiles {
			if err := os.WriteFile(filepath.Join(dir, fmt.Sprintf("flat-%06d.png", i)), payload, 0o644); err != nil {
				benchTreeErr = err
				return
			}
		}
		for d := range benchNestedDirs {
			sub := filepath.Join(dir, fmt.Sprintf("sub-%03d", d))
			if err := os.Mkdir(sub, 0o755); err != nil {
				benchTreeErr = err
				return
			}
			for i := range benchNestedFiles / benchNestedDirs {
				if err := os.WriteFile(filepath.Join(sub, fmt.Sprintf("doc-%05d.md", i)), payload, 0o644); err != nil {
					benchTreeErr = err
					return
				}
			}
		}
		if err := os.Mkdir(filepath.Join(dir, ".cache"), 0o755); err != nil {
			benchTreeErr = err
			return
		}
		if err := os.WriteFile(filepath.Join(dir, ".cache", "junk.png"), payload, 0o644); err != nil {
			benchTreeErr = err
			return
		}
		if err := os.WriteFile(filepath.Join(dir, ".DS_Store"), payload, 0o644); err != nil {
			benchTreeErr = err
			return
		}
		if err := os.Symlink(filepath.Join(dir, "flat-000000.png"), filepath.Join(dir, "alias.png")); err != nil {
			benchTreeErr = err
			return
		}
	})
	return benchTreeDir, benchTreeErr
}

func TestMain(m *testing.M) {
	code := m.Run()
	if benchTreeDir != "" {
		_ = os.RemoveAll(benchTreeDir)
	}
	if benchDB != nil {
		_ = benchDB.Close()
	}
	if benchDBDir != "" {
		_ = os.RemoveAll(benchDBDir)
	}
	os.Exit(code)
}

func BenchmarkListFolderImportFiles(b *testing.B) {
	if os.Getenv("IW_BENCH") == "" {
		b.Skip("set IW_BENCH=1 to build the 100k-file fixture")
	}
	dir, err := buildBenchTree()
	if err != nil {
		b.Fatal(err)
	}
	service := NewResourceService(nil, nil)
	ctx := context.Background()
	b.ResetTimer()
	for range b.N {
		expansion, err := service.ExpandImportPaths(ctx, []string{dir})
		if err != nil {
			b.Fatal(err)
		}
		if len(expansion.Files) != benchFlatFiles+benchNestedFiles {
			b.Fatalf("unexpected file count: %d", len(expansion.Files))
		}
	}
}

// benchEnqueueService 构建带 2000 条 file source 的库，模拟一个已有规模的资源库。
func benchEnqueueService(b *testing.B) *ResourceService {
	benchDBOnce.Do(func() {
		dir, err := os.MkdirTemp("", "iw-bench-db-*")
		if err != nil {
			benchDBErr = err
			return
		}
		benchDBDir = dir
		db, err := storage.Open(filepath.Join(dir, "bench.db"))
		if err != nil {
			benchDBErr = err
			return
		}
		benchDB = db
	})
	if benchDBErr != nil {
		b.Fatal(benchDBErr)
	}
	service := NewResourceService(benchDB, remote.NewFetcher())
	ctx := context.Background()

	row := benchDB.SqlDB().QueryRowContext(ctx, `SELECT COUNT(*) FROM sources WHERE type = 'file'`)
	var count int
	if err := row.Scan(&count); err != nil {
		b.Fatal(err)
	}
	if count > 0 {
		return service
	}
	err := benchDB.WithTx(ctx, func(tx *sql.Tx) error {
		for i := range benchSeedSources {
			res := storage.ResourceModel{ID: fmt.Sprintf("res-%06d", i), Title: fmt.Sprintf("r%d", i), CreatedAt: int64(i), UpdatedAt: int64(i)}
			if err := service.resources.Insert(ctx, tx, res); err != nil {
				return err
			}
			src := storage.SourceModel{
				ID:          fmt.Sprintf("src-%06d", i),
				ResourceID:  res.ID,
				Type:        storage.SourceTypeFile,
				Location:    fmt.Sprintf("/seed/library/file-%06d.png", i),
				Available:   true,
				IsPreferred: true,
				OrderIndex:  0,
				CreatedAt:   int64(i),
				UpdatedAt:   int64(i),
			}
			if err := service.sources.Insert(ctx, tx, src); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		b.Fatal(err)
	}
	return service
}

// BenchmarkFindLocationMatches500 逐项重复检查的真实形态：addQueue 对每个文件发一次
// 单位置查询。这里对 2000 条存量的库连发 500 次单位置查询（未命中路径，入队主路径）。
func BenchmarkFindLocationMatches500(b *testing.B) {
	if os.Getenv("IW_BENCH") == "" {
		b.Skip("set IW_BENCH=1 to run")
	}
	service := benchEnqueueService(b)
	ctx := context.Background()
	b.ResetTimer()
	for range b.N {
		for i := range benchLookupBatch {
			matches, err := service.FindResourceLocationMatches(ctx, fmt.Sprintf("/seed/library/file-%06d.png", i), storage.SourceTypeFile)
			if err != nil {
				b.Fatal(err)
			}
			if len(matches) != 1 {
				b.Fatalf("expected 1 match, got %d", len(matches))
			}
		}
	}
}
