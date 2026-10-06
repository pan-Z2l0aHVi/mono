package media

import (
	"container/list"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"sync"
)

const (
	defaultPendingPreviewCapacity = 64
	pendingPreviewTokenBytes      = 32
)

type pendingPreviewEntry struct {
	token    string
	location string
}

// PendingPreviewRegistry 为尚未持久化的本地媒体提供有界、不可推断的读取授权。
type PendingPreviewRegistry struct {
	mu       sync.Mutex
	capacity int
	entries  map[string]*list.Element
	recent   *list.List
}

// NewPendingPreviewRegistry 创建使用默认容量的 pending media 注册表。
func NewPendingPreviewRegistry() *PendingPreviewRegistry {
	return newPendingPreviewRegistry(defaultPendingPreviewCapacity)
}

func newPendingPreviewRegistry(capacity int) *PendingPreviewRegistry {
	if capacity < 1 {
		panic("pending preview capacity must be positive")
	}
	return &PendingPreviewRegistry{
		capacity: capacity,
		entries:  make(map[string]*list.Element, capacity),
		recent:   list.New(),
	}
}

// Register 授权读取一个已存在的普通文件；容量不足时淘汰最久未使用的授权。
func (r *PendingPreviewRegistry) Register(location string) (string, error) {
	info, err := os.Stat(location)
	if err != nil {
		return "", fmt.Errorf("stat pending preview: %w", err)
	}
	if !info.Mode().IsRegular() {
		return "", errors.New("pending preview is not a regular file")
	}

	for {
		token, err := newPendingPreviewToken()
		if err != nil {
			return "", fmt.Errorf("create pending preview token: %w", err)
		}

		r.mu.Lock()
		if _, exists := r.entries[token]; exists {
			r.mu.Unlock()
			continue
		}
		element := r.recent.PushBack(pendingPreviewEntry{token: token, location: location})
		r.entries[token] = element
		if r.recent.Len() > r.capacity {
			oldest := r.recent.Front()
			delete(r.entries, oldest.Value.(pendingPreviewEntry).token)
			r.recent.Remove(oldest)
		}
		r.mu.Unlock()
		return token, nil
	}
}

// Get 返回授权位置并将其标记为最近使用；无效、未知或已释放 token 均失败。
func (r *PendingPreviewRegistry) Get(token string) (string, bool) {
	if !validPendingPreviewToken(token) {
		return "", false
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	element, exists := r.entries[token]
	if !exists {
		return "", false
	}
	r.recent.MoveToBack(element)
	return element.Value.(pendingPreviewEntry).location, true
}

// Release 撤销 token。重复释放是幂等操作。
func (r *PendingPreviewRegistry) Release(token string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	element, exists := r.entries[token]
	if !exists {
		return false
	}
	delete(r.entries, token)
	r.recent.Remove(element)
	return true
}

// Clear 撤销全部 pending media 授权。
func (r *PendingPreviewRegistry) Clear() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = make(map[string]*list.Element, r.capacity)
	r.recent.Init()
}

func newPendingPreviewToken() (string, error) {
	bytes := make([]byte, pendingPreviewTokenBytes)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func validPendingPreviewToken(token string) bool {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	return err == nil && len(decoded) == pendingPreviewTokenBytes
}
