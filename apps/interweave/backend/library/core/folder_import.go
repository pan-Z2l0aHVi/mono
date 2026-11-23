package core

import (
	"context"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
)

// ImportExpansion 是一次展开的结果：可纳入的文件清单，以及实际递归展开的顶层文件夹数。
// 前端用 Folders 决定确认文案是否补一句「N 个文件夹已递归展开」——纯文件多选不提示。
type ImportExpansion struct {
	Files   []string
	Folders int
}

// ExpandImportPaths 把一批用户选中的入口（文件与文件夹混合，来自选择面板、拖入或剪贴板）
// 展开为可纳入的文件位置清单：目录递归展开，普通文件原样保留。
// 只列目录、不读取内容：展示分类与可用性探测仍走既有纳入路径（CreateResource / PrepareFilePreview）。
// 顶层条目按显式意图处理——跟随符号链接到目标（文件按目标纳入，目录按目标递归），
// 目录内部的符号链接一律跳过（避免成环与别名），连同隐藏项（"." 前缀含子树）与非普通文件。
// 导入面向用户整理的资料，不收 .DS_Store、.git 内部或缓存；目录本身不是 Source。
// 用户显式选中的隐藏目录不拦：它就是导入意图，只过滤其内部的隐藏项。
// 重复路径（同时选中目录与其内部文件）只保留一份，最终按字典序产出确定顺序。
// 展开先于确认完成：返回清单的长度就是阈值判据，因此这里不设遍历上限；超大目录的
// 遍历与 IPC 清单一律由用户显式选中它的动作触发，页面在展开后展示批次大小再请求放行。
func (s *ResourceService) ExpandImportPaths(ctx context.Context, paths []string) (ImportExpansion, error) {
	files := make([]string, 0, 64)
	seen := make(map[string]bool, len(paths))
	// folders 只数顶层选中并成功展开的目录；目录内部的子目录不算，文案说的是「选了哪些文件夹」。
	folders := 0
	for _, raw := range paths {
		if err := ctx.Err(); err != nil {
			return ImportExpansion{}, err
		}
		root, err := normalize.FilePath(raw)
		if err != nil {
			return ImportExpansion{}, fmt.Errorf("invalid import path: %w", err)
		}
		// 顶层跟随符号链接到真实目标：显式选中的链接文件纳入其目标文件，链接目录按目标递归；
		// 链接成环或选择到确认之间被删除的条目只影响自身，不拖垮整批。
		resolved, err := filepath.EvalSymlinks(root)
		if err != nil {
			continue
		}
		info, err := os.Stat(resolved)
		if err != nil {
			continue
		}
		if info.IsDir() {
			// 同一目录被重复选中（面板与拖入重叠、父子目录同时选中）只展开一次、只计一个。
			if seen[resolved] {
				continue
			}
			seen[resolved] = true
			if err := collectImportFiles(ctx, resolved, seen, &files); err != nil {
				return ImportExpansion{}, err
			}
			folders++
			continue
		}
		if !info.Mode().IsRegular() {
			continue
		}
		if !seen[resolved] {
			seen[resolved] = true
			files = append(files, resolved)
		}
	}
	sort.Strings(files)
	return ImportExpansion{Files: files, Folders: folders}, nil
}

// collectImportFiles 递归收集目录下可纳入的文件，跳过规则见 ExpandImportPaths。
func collectImportFiles(ctx context.Context, root string, seen map[string]bool, files *[]string) error {
	return filepath.WalkDir(root, func(path string, entry fs.DirEntry, walkErr error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if walkErr != nil {
			// 无权限等单点读失败只砍掉对应子树，不让整批导入失败。
			if entry != nil && entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if path != root && strings.HasPrefix(entry.Name(), ".") {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if entry.IsDir() {
			// 走过的目录记账：父目录已展开时，用户再单独选中其子目录不再重复展开、不再计数。
			if path != root {
				seen[filepath.Clean(path)] = true
			}
			return nil
		}
		// 符号链接不跟进也不纳入：目录链会成环，文件链的可用性归监听与探测口径。
		if entry.Type()&os.ModeSymlink != 0 {
			return nil
		}
		fileInfo, err := entry.Info()
		if err != nil || !fileInfo.Mode().IsRegular() {
			return nil
		}
		clean := filepath.Clean(path)
		if !seen[clean] {
			seen[clean] = true
			*files = append(*files, clean)
		}
		return nil
	})
}
