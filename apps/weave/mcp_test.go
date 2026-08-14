package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// jsonrpcReq 是 MCP 请求的最小结构。
type jsonrpcReq struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  any    `json:"params,omitempty"`
}

// mcpClient 管理 Streamable HTTP 会话（Mcp-Session-Id）与令牌鉴权。
type mcpClient struct {
	base    string
	token   string
	session string
}

func (c *mcpClient) call(t *testing.T, id int, method string, params any) map[string]any {
	t.Helper()
	b, _ := json.Marshal(jsonrpcReq{JSONRPC: "2.0", ID: id, Method: method, Params: params})
	req, err := http.NewRequest(http.MethodPost, c.base+"/mcp", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)
	if c.session != "" {
		req.Header.Set("Mcp-Session-Id", c.session)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if sid := resp.Header.Get("Mcp-Session-Id"); sid != "" {
		c.session = sid
	}
	data, _ := io.ReadAll(resp.Body)
	// Streamable HTTP 可能返回 SSE（text/event-stream）或直接 JSON
	var out map[string]any
	if json.Unmarshal(data, &out) != nil {
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "data:") {
				continue
			}
			payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			if payload == "" || payload == "[DONE]" {
				continue
			}
			var m map[string]any
			if json.Unmarshal([]byte(payload), &m) == nil {
				out = m
			}
		}
	}
	return out
}

func TestMcpAuthAndTools(t *testing.T) {
	db := openTestDB(t)
	items, tags, repairs, index := newTestServices(t, db)
	ctx := context.Background()
	mgr := NewMcpManager(db, items, tags, repairs, index)
	if err := mgr.Start(ctx); err != nil {
		t.Fatalf("启动 MCP: %v", err)
	}
	defer mgr.Stop()
	client := &mcpClient{base: mgr.getBaseURL(), token: mgr.getToken()}
	if client.base == "" || client.token == "" {
		t.Fatalf("MCP 地址/令牌为空")
	}

	// 无令牌应 401
	resp, err := http.Post(client.base+"/mcp", "application/json", bytes.NewReader([]byte(`{}`)))
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("无令牌应 401, got %d", resp.StatusCode)
	}

	// initialize（建立会话）
	init := client.call(t, 1, "initialize", map[string]any{
		"protocolVersion": "2025-03-26", "capabilities": map[string]any{}, "clientInfo": map[string]any{"name": "test", "version": "0"}})
	if init["result"] == nil {
		t.Fatalf("initialize 失败: %v", init)
	}

	// tools/list
	tools := client.call(t, 2, "tools/list", nil)
	result, ok := tools["result"].(map[string]any)
	if !ok {
		t.Fatalf("tools/list 失败: %v", tools)
	}
	list, _ := result["tools"].([]any)
	if len(list) < 10 {
		t.Fatalf("工具数量过少: %d", len(list))
	}

	toolsCall := func(id int, name string, args map[string]any) map[string]any {
		return client.call(t, id, "tools/call", map[string]any{"name": name, "arguments": args})
	}
	create := toolsCall(3, "create_tag", map[string]any{"name": "photos", "parent_path": ""})
	if create["result"] == nil {
		t.Fatalf("create_tag 失败: %v", create)
	}
	dir := t.TempDir()
	add := toolsCall(4, "add_item", map[string]any{"locator": filepath.Join(dir, "pic.png"), "tag_paths": []string{"photos"}})
	if add["result"] == nil {
		t.Fatalf("add_item 失败: %v", add)
	}
	stats := toolsCall(5, "get_stats", map[string]any{})
	if stats["result"] == nil {
		t.Fatalf("get_stats 失败: %v", stats)
	}
	// 删除源文件后 list_broken 应非空（先 rescan 让状态落库）
	_ = os.Remove(filepath.Join(dir, "pic.png"))
	_ = toolsCall(6, "rescan", map[string]any{})
	broken := toolsCall(7, "list_broken", map[string]any{})
	brokenResult, _ := broken["result"].(map[string]any)
	content := brokenResult["content"].([]any)
	if len(content) == 0 {
		t.Fatalf("list_broken 应非空: %v", broken)
	}
}

func TestMcpListTagsReturnsPathTree(t *testing.T) {
	db := openTestDB(t)
	items, tags, repairs, index := newTestServices(t, db)
	mgr := NewMcpManager(db, items, tags, repairs, index)
	if err := mgr.Start(context.Background()); err != nil {
		t.Fatalf("启动 MCP: %v", err)
	}
	defer mgr.Stop()

	client := &mcpClient{base: mgr.getBaseURL(), token: mgr.getToken()}
	initialize := client.call(t, 1, "initialize", map[string]any{
		"protocolVersion": "2025-03-26", "capabilities": map[string]any{}, "clientInfo": map[string]any{"name": "test", "version": "0"},
	})
	if initialize["result"] == nil {
		t.Fatalf("initialize 失败: %v", initialize)
	}

	tools := client.call(t, 2, "tools/list", nil)
	toolsResult, _ := tools["result"].(map[string]any)
	toolsList, _ := toolsResult["tools"].([]any)
	foundListTags := false
	for _, raw := range toolsList {
		tool, _ := raw.(map[string]any)
		if tool["name"] == "list_tags" {
			foundListTags = true
			break
		}
	}
	if !foundListTags {
		t.Fatalf("tools/list 未返回 list_tags: %v", tools)
	}

	callTool := func(id int, name string, arguments map[string]any) map[string]any {
		return client.call(t, id, "tools/call", map[string]any{"name": name, "arguments": arguments})
	}
	created := callTool(3, "create_tag", map[string]any{"name": "library/images", "parent_path": ""})
	if created["result"] == nil {
		t.Fatalf("create_tag 失败: %v", created)
	}
	file := writeFile(t, t.TempDir(), "cover.png", "image")
	added := callTool(4, "add_item", map[string]any{"locator": file, "tag_paths": []string{"library/images"}})
	if added["result"] == nil {
		t.Fatalf("add_item 失败: %v", added)
	}

	listed := callTool(5, "list_tags", map[string]any{})
	listedResult, _ := listed["result"].(map[string]any)
	content, _ := listedResult["content"].([]any)
	if len(content) != 1 {
		t.Fatalf("list_tags 响应内容错误: %v", listed)
	}
	entry, _ := content[0].(map[string]any)
	text, _ := entry["text"].(string)
	var tree []Tag
	if err := json.Unmarshal([]byte(text), &tree); err != nil {
		t.Fatalf("list_tags 返回的 Tag DTO JSON 无法解析: %v; 响应: %v", err, listed)
	}
	if len(tree) != 1 || tree[0].Path != "library" || tree[0].ItemCount != 1 {
		t.Fatalf("根标签或继承条目数错误: %+v", tree)
	}
	if len(tree[0].Children) != 1 || tree[0].Children[0].Path != "library/images" || tree[0].Children[0].ItemCount != 1 {
		t.Fatalf("路径式子标签错误: %+v", tree)
	}
}

func TestMediaHandlerServesFile(t *testing.T) {
	db := openTestDB(t)
	items, _, _, _ := newTestServices(t, db)
	ctx := context.Background()
	dir := t.TempDir()
	p := writeFile(t, dir, "doc.txt", "hello weave")

	res, err := items.AddFiles(ctx, []string{p}, nil)
	if err != nil || res.Added != 1 {
		t.Fatalf("添加文件: %v %+v", err, res)
	}
	item, _ := items.ListItems(ctx, ListQuery{})
	id := item[0].ID

	req, _ := http.NewRequest(http.MethodGet, "/media/"+id, nil)
	rec := newRecorder()
	mediaHandler(db).ServeHTTP(rec, req)
	if rec.code != 200 || rec.body != "hello weave" {
		t.Fatalf("media 响应错误: code=%d body=%q", rec.code, rec.body)
	}
}

type recorder struct {
	code int
	body string
	hdr  http.Header
}

func newRecorder() *recorder { return &recorder{hdr: http.Header{}} }

func (r *recorder) Header() http.Header { return r.hdr }
func (r *recorder) WriteHeader(code int) {
	if r.code == 0 {
		r.code = code
	}
}
func (r *recorder) Write(b []byte) (int, error) {
	if r.code == 0 {
		r.code = 200
	}
	r.body += string(b)
	return len(b), nil
}
