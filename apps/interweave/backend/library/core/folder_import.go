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
func (s *ResourceService) ExpandImportPaths(ctx context.Context, paths []string) ([]string, error) {
	files := make([]string, 0, 64)
	seen := make(map[string]bool, len(paths))
	for _, raw := range paths {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		root, err := normalize.FilePath(raw)
		if err != nil {
			return nil, fmt.Errorf("invalid import path: %w", err)
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
			if err := collectImportFiles(ctx, resolved, seen, &files); err != nil {
				return nil, err
			}
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
	return files, nil
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
