package backend

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// mcpManager 运行本地 HTTP 服务：/mcp（Streamable HTTP，令牌鉴权）与 /media/{id}（本地流）。
type mcpManager struct {
	db        *sql.DB
	itemSvc   *ItemService
	tagSvc    *TagService
	repairSvc *RepairService
	indexSvc  *IndexService

	mu       sync.RWMutex
	enabled  bool
	token    string
	port     int
	baseURL  string
	running  bool
	httpSrv  *http.Server
	listener net.Listener
}

func NewMcpManager(db *sql.DB, itemSvc *ItemService, tagSvc *TagService, repairSvc *RepairService, indexSvc *IndexService) *mcpManager {
	return &mcpManager{db: db, itemSvc: itemSvc, tagSvc: tagSvc, repairSvc: repairSvc, indexSvc: indexSvc}
}

func (m *mcpManager) isEnabled() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.enabled
}

func (m *mcpManager) getToken() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.token
}

func (m *mcpManager) getBaseURL() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.baseURL
}

func (m *mcpManager) isRunning() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.running
}

// Start 读取设置并启动本地 HTTP 服务（MCP 默认启用；媒体始终可用）。
func (m *mcpManager) Start(ctx context.Context) error {
	enabled, _ := GetSetting(m.db, "mcp_enabled")
	token, _ := GetSetting(m.db, "mcp_token")
	if token == "" {
		token = newID() + newID()
		if err := setSetting(ctx, m.db, "mcp_token", token); err != nil {
			return err
		}
	}
	m.mu.Lock()
	m.enabled = enabled != "0"
	m.token = token
	m.mu.Unlock()

	mcpServer := server.NewMCPServer("interweave", "0.1.0", server.WithToolCapabilities(true))
	m.registerTools(mcpServer)
	streamable := server.NewStreamableHTTPServer(mcpServer)

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("监听本地端口: %w", err)
	}
	port := ln.Addr().(*net.TCPAddr).Port
	base := fmt.Sprintf("http://127.0.0.1:%d", port)

	mux := http.NewServeMux()
	mux.Handle("/mcp", m.authMiddleware(streamable))
	mux.Handle("/media/", mediaHandler(m.db))

	m.mu.Lock()
	m.port = port
	m.baseURL = base
	m.running = true
	m.httpSrv = &http.Server{Handler: mux}
	m.listener = ln
	m.mu.Unlock()

	go func() {
		_ = m.httpSrv.Serve(ln)
	}()
	return nil
}

// Stop 关闭本地 HTTP 服务。
func (m *mcpManager) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !m.running {
		return
	}
	m.running = false
	if m.httpSrv != nil {
		_ = m.httpSrv.Close()
	}
}

func (m *mcpManager) setEnabled(enabled bool) error {
	m.mu.Lock()
	m.enabled = enabled
	m.mu.Unlock()
	return setSetting(context.Background(), m.db, "mcp_enabled", boolStr(enabled))
}

func (m *mcpManager) regenerateToken(ctx context.Context) (string, error) {
	token := newID() + newID()
	if err := setSetting(ctx, m.db, "mcp_token", token); err != nil {
		return "", err
	}
	m.mu.Lock()
	m.token = token
	m.mu.Unlock()
	return token, nil
}

func boolStr(b bool) string {
	if b {
		return "1"
	}
	return "0"
}

// authMiddleware 校验 MCP 令牌；媒体路径不受限（仅本机）。
func (m *mcpManager) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !m.isEnabled() {
			http.Error(w, "mcp disabled", http.StatusForbidden)
			return
		}
		auth := r.Header.Get("Authorization")
		bearer, _ := strings.CutPrefix(auth, "Bearer ")
		headerToken := r.Header.Get("X-Interweave-Token")
		if bearer != m.getToken() && headerToken != m.getToken() {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ---- 工具注册 ----

func (m *mcpManager) registerTools(srv *server.MCPServer) {
	jsonResult := func(v any) (*mcp.CallToolResult, error) {
		b, err := json.MarshalIndent(v, "", "  ")
		if err != nil {
			return nil, err
		}
		return mcp.NewToolResultText(string(b)), nil
	}
	textResult := func(s string) (*mcp.CallToolResult, error) {
		return mcp.NewToolResultText(s), nil
	}

	srv.AddTool(
		mcp.NewTool("list_tags", mcp.WithDescription("返回当前标签列表（Bear 式路径树；父标签条目数包含子孙）")),
		func(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			tags, err := m.tagSvc.ListTags(ctx)
			if err != nil {
				return nil, err
			}
			return jsonResult(tags)
		})

	srv.AddTool(
		mcp.NewTool("create_tag",
			mcp.WithDescription("创建标签；parent_path 为空表示根标签"),
			mcp.WithString("name", mcp.Required()),
			mcp.WithString("parent_path", mcp.DefaultString("")),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			name, _ := args(req)["name"].(string)
			parent, _ := args(req)["parent_path"].(string)
			tag, err := m.tagSvc.CreateTag(ctx, name, parent)
			if err != nil {
				return nil, err
			}
			return jsonResult(tag)
		})

	srv.AddTool(
		mcp.NewTool("rename_tag",
			mcp.WithDescription("重命名标签最后一段，子孙路径前缀自动更新"),
			mcp.WithString("path", mcp.Required()),
			mcp.WithString("new_name", mcp.Required()),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			p, _ := args(req)["path"].(string)
			name, _ := args(req)["new_name"].(string)
			if err := m.tagSvc.RenameTag(ctx, p, name); err != nil {
				return nil, err
			}
			return textResult("ok")
		})

	srv.AddTool(
		mcp.NewTool("move_tag",
			mcp.WithDescription("把标签（含子树）移动到新父标签下；空字符串表示移到根"),
			mcp.WithString("path", mcp.Required()),
			mcp.WithString("new_parent_path", mcp.Required()),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			p, _ := args(req)["path"].(string)
			parent, _ := args(req)["new_parent_path"].(string)
			if err := m.tagSvc.MoveTag(ctx, p, parent); err != nil {
				return nil, err
			}
			return textResult("ok")
		})

	srv.AddTool(
		mcp.NewTool("delete_tag",
			mcp.WithDescription("删除标签及其整个子树（条目保留，仅解除标签关系）"),
			mcp.WithString("path", mcp.Required()),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			p, _ := args(req)["path"].(string)
			if err := m.tagSvc.DeleteTag(ctx, p); err != nil {
				return nil, err
			}
			return textResult("ok")
		})

	srv.AddTool(
		mcp.NewTool("search_items",
			mcp.WithDescription("按标签（含子孙）、名称、类型、状态检索条目"),
			mcp.WithString("tag_path", mcp.DefaultString("")),
			mcp.WithString("search", mcp.DefaultString("")),
			mcp.WithString("kind", mcp.DefaultString("")),
			mcp.WithString("status", mcp.DefaultString("")),
			mcp.WithNumber("limit", mcp.DefaultNumber(200)),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			q := ListQuery{}
			if v, ok := args(req)["tag_path"].(string); ok {
				q.TagPath = v
			}
			if v, ok := args(req)["search"].(string); ok {
				q.Search = v
			}
			if v, ok := args(req)["kind"].(string); ok {
				q.Kind = v
			}
			if v, ok := args(req)["status"].(string); ok {
				q.Status = v
			}
			if v, ok := args(req)["limit"].(float64); ok {
				q.Limit = int(v)
			}
			items, err := m.itemSvc.ListItems(ctx, q)
			if err != nil {
				return nil, err
			}
			return jsonResult(items)
		})

	srv.AddTool(
		mcp.NewTool("get_item",
			mcp.WithDescription("按 ID 获取条目详情"),
			mcp.WithString("id", mcp.Required()),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			id, _ := args(req)["id"].(string)
			item, err := m.itemSvc.GetItem(ctx, id)
			if err != nil {
				return nil, err
			}
			return jsonResult(item)
		})

	srv.AddTool(
		mcp.NewTool("add_item",
			mcp.WithDescription("添加条目：locator 为本地文件绝对路径或 http(s) URL；tag_paths 为路径式标签（可选）"),
			mcp.WithString("locator", mcp.Required()),
			mcp.WithArray("tag_paths", mcp.DefaultArray([]string{})),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			loc, _ := args(req)["locator"].(string)
			tagPaths := stringArrayArg(req, "tag_paths")
			if strings.HasPrefix(loc, "http://") || strings.HasPrefix(loc, "https://") {
				item, err := m.itemSvc.AddUrl(ctx, loc, tagPaths)
				if err != nil {
					return nil, err
				}
				return jsonResult(item)
			}
			res, err := m.itemSvc.AddFiles(ctx, []string{loc}, tagPaths)
			if err != nil {
				return nil, err
			}
			if res.Added == 0 {
				return textResult("未新增（可能已存在或路径无效）")
			}
			return jsonResult(res.Items)
		})

	srv.AddTool(
		mcp.NewTool("remove_item",
			mcp.WithDescription("移除条目（仅解除登记，不删除源文件）"),
			mcp.WithString("id", mcp.Required()),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			id, _ := args(req)["id"].(string)
			if err := m.itemSvc.RemoveItems(ctx, []string{id}); err != nil {
				return nil, err
			}
			return textResult("ok")
		})

	srv.AddTool(
		mcp.NewTool("update_item_tags",
			mcp.WithDescription("用路径式标签集合替换条目标签（不存在的标签自动创建）"),
			mcp.WithString("id", mcp.Required()),
			mcp.WithArray("tag_paths", mcp.Required()),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			id, _ := args(req)["id"].(string)
			tagPaths := stringArrayArg(req, "tag_paths")
			if err := m.itemSvc.SetItemTags(ctx, id, tagPaths); err != nil {
				return nil, err
			}
			return textResult("ok")
		})

	srv.AddTool(
		mcp.NewTool("list_broken",
			mcp.WithDescription("列出断链修复项（state=open）"),
		),
		func(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			repairs, err := m.repairSvc.ListRepairs(ctx, "open")
			if err != nil {
				return nil, err
			}
			return jsonResult(repairs)
		})

	srv.AddTool(
		mcp.NewTool("repair_item",
			mcp.WithDescription("修复断链：提供 target_path 手动指定新位置；省略则尝试唯一候选自动修复"),
			mcp.WithString("repair_id", mcp.Required()),
			mcp.WithString("target_path", mcp.DefaultString("")),
		),
		func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			id, _ := args(req)["repair_id"].(string)
			target, _ := args(req)["target_path"].(string)
			if target != "" {
				if err := m.repairSvc.Repair(ctx, id, target); err != nil {
					return nil, err
				}
				return textResult("repaired: " + target)
			}
			ok, err := m.repairSvc.AutoRepair(ctx, id)
			if err != nil {
				return nil, err
			}
			if !ok {
				return textResult("没有唯一强匹配候选，请使用 list_broken + get candidates 或提供 target_path")
			}
			return textResult("auto-repaired")
		})

	srv.AddTool(
		mcp.NewTool("rescan",
			mcp.WithDescription("执行全量扫描：校验条目、补齐监听根新文件、尝试唯一候选自动修复"),
		),
		func(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			res, err := m.indexSvc.Rescan(ctx)
			if err != nil {
				return nil, err
			}
			return jsonResult(res)
		})

	srv.AddTool(
		mcp.NewTool("get_stats",
			mcp.WithDescription("返回库统计：条目/文件/URL/断链/标签/监听根/待修复数量"),
		),
		func(ctx context.Context, _ mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			stats, err := m.indexSvc.GetStats(ctx)
			if err != nil {
				return nil, err
			}
			return jsonResult(stats)
		})
}

// args 从工具参数中读取字符串->any 映射。
func args(req mcp.CallToolRequest) map[string]any {
	if m, ok := req.Params.Arguments.(map[string]any); ok {
		return m
	}
	return nil
}

// stringArrayArg 从工具参数中读取字符串数组（兼容 JSON 数组与逗号分隔字符串）。
func stringArrayArg(req mcp.CallToolRequest, key string) []string {
	raw, ok := args(req)[key]
	if !ok {
		return nil
	}
	switch v := raw.(type) {
	case []any:
		out := make([]string, 0, len(v))
		for _, e := range v {
			if s, ok := e.(string); ok {
				out = append(out, s)
			}
		}
		return out
	case []string:
		return v
	case string:
		if v == "" {
			return nil
		}
		parts := strings.Split(v, ",")
		out := make([]string, 0, len(parts))
		for _, p := range parts {
			if s := strings.TrimSpace(p); s != "" {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}
