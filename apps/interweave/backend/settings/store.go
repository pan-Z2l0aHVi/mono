package settings

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/wailsapp/wails/v3/pkg/services/kvstore"
)

// settingsKey 是 kvstore 里的唯一 key：整份 typed 设置作为它的值，一次变更就是一次整体替换。
const settingsKey = "settings"

// tempSuffix 是原子落盘的中转文件名后缀。kvstore 的 Save 是裸 os.WriteFile，直接写正式文件
// 会在写入中途留下截断内容；先写同目录的中转文件再 rename，读侧才不会见到半份设置。
const tempSuffix = ".tmp"

// Store 是设置的持久化载体：内存状态、JSON 编解码与文件读写交给官方 kvstore，
// 原子落盘由本类型补上。kvstore 不注册为 Wails Service，它的 Set/Clear 因此不会
// 变成前端可调用方法。
type Store struct {
	mu   sync.Mutex
	kvs  *kvstore.KVStoreService
	path string
}

// NewStore 准备设置文件所在目录并返回未加载的存储。目录建不出来直接返回错误：
// 没有可写目录时后续每次保存都会失败，启动时就该让调用方知道。
func NewStore(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create settings directory for %s: %w", path, err)
	}
	return &Store{
		kvs:  kvstore.NewWithConfig(&kvstore.Config{Filename: path, AutoSave: false}),
		path: path,
	}, nil
}

// TempPath 返回设置文件的中转路径，供启动清理、Save 与测试共用同一份约定。
func TempPath(path string) string {
	return path + tempSuffix
}

// RemoveStaleTemp 清掉上次异常退出留下的中转文件。正常路径的中转文件在 Save 里当场
// rename 掉，所以只在启动时调一次就够。
func RemoveStaleTemp(path string) {
	_ = os.Remove(TempPath(path))
}

// Load 读出设置并收敛进白名单。
//
// 文件不存在是首次启动，不是错误：返回默认值且不带警告。文件损坏或不可读时同样回默认值，
// 但把原因作为警告交回调用方——设置丢了需要让用户知道，却也不该拦住应用启动。
// 返回的第二个值是一次性的用户可见警告，第三个值只在「读到了但既非空也不可解析」时为 nil。
func (s *Store) Load() (Settings, []string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.kvs.Load(); err != nil {
		return Defaults(), []string{fmt.Sprintf("读取设置失败，已回落到默认设置：%v", err)}
	}
	value := s.kvs.Get(settingsKey)
	if value == nil {
		return Defaults(), nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return Defaults(), []string{fmt.Sprintf("设置内容无法解析，已回落到默认设置：%v", err)}
	}
	var loaded Settings
	if err := json.Unmarshal(raw, &loaded); err != nil {
		return Defaults(), []string{fmt.Sprintf("设置内容无法解析，已回落到默认设置：%v", err)}
	}
	if loaded == (Settings{}) {
		// 文件在但不是一份真设置（空对象）：等同从未保存，不报字段修正警告。
		return Defaults(), nil
	}
	normalized, warnings := loaded.normalize()
	return normalized, warnings
}

// Save 把整份设置写入磁盘：先落到同目录中转文件，再 rename 覆盖正式文件。
// 失败时保留原因并清掉中转文件，正式文件保持上一次的完整内容。
func (s *Store) Save(settings Settings) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.kvs.Set(settingsKey, settings); err != nil {
		return fmt.Errorf("stage settings: %w", err)
	}
	tmp := TempPath(s.path)
	// 每次写都换配置：kvstore 的 Configure 只影响后续 Save 的落点。
	s.kvs.Configure(&kvstore.Config{Filename: tmp, AutoSave: false})
	if err := s.kvs.Save(); err != nil {
		s.kvs.Configure(&kvstore.Config{Filename: s.path, AutoSave: false})
		_ = os.Remove(tmp)
		return fmt.Errorf("write settings to %s: %w", tmp, err)
	}
	s.kvs.Configure(&kvstore.Config{Filename: s.path, AutoSave: false})
	if err := os.Rename(tmp, s.path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("replace settings file %s: %w", s.path, err)
	}
	return nil
}
