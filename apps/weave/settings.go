package main

import (
	"context"
	"database/sql"
)

// SettingsService 提供应用设置（MCP 开关、启动扫描、令牌轮换）。
type SettingsService struct {
	db  *sql.DB
	mcp *mcpManager
}

func NewSettingsService(db *sql.DB, mcp *mcpManager) *SettingsService {
	return &SettingsService{db: db, mcp: mcp}
}

// GetSettings 返回当前设置（含 MCP/媒体服务地址）。
func (s *SettingsService) GetSettings(ctx context.Context) (Settings, error) {
	enabled := s.mcp.isEnabled()
	token := s.mcp.getToken()
	rescan, _ := getSetting(s.db, "rescan_on_start")
	libraryPath, _ := getSetting(s.db, "library_path")
	base := s.mcp.getBaseURL()
	return Settings{
		McpEnabled:    enabled,
		McpRunning:    s.mcp.isRunning(),
		McpToken:      token,
		BaseURL:       base,
		McpURL:        base + "/mcp",
		MediaURL:      base + "/media/",
		LibraryPath:   libraryPath,
		RescanOnStart: rescan == "1",
	}, nil
}

// UpdateSettings 应用设置补丁。
func (s *SettingsService) UpdateSettings(ctx context.Context, patch SettingsPatch) error {
	if patch.McpEnabled != nil {
		if err := s.mcp.setEnabled(*patch.McpEnabled); err != nil {
			return err
		}
	}
	if patch.RescanOnStart != nil {
		v := "0"
		if *patch.RescanOnStart {
			v = "1"
		}
		if err := setSetting(ctx, s.db, "rescan_on_start", v); err != nil {
			return err
		}
	}
	return nil
}

// RegenerateMcpToken 轮换 MCP 访问令牌。
func (s *SettingsService) RegenerateMcpToken(ctx context.Context) (string, error) {
	token, err := s.mcp.regenerateToken(ctx)
	if err != nil {
		return "", err
	}
	return token, nil
}

// SetLibraryPath 记录库数据库位置（供 UI 展示）。
func (s *SettingsService) SetLibraryPath(ctx context.Context, path string) error {
	return setSetting(ctx, s.db, "library_path", path)
}
