// cspell:ignore bplist plutil

package main

import (
	"bytes"
	"encoding/xml"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
)

type dockDropSink interface {
	EmitFiles(paths []string)
	EmitURLs(urls []string)
	PresentWindow()
}

// dockDropDispatcher 缓冲冷启动时由 Dock/任务栏图标拖入的文件与链接，
// 待前端运行时就绪后再一次性发往导入队列并前置窗口。
type dockDropDispatcher struct {
	mu           sync.Mutex
	ready        bool
	pendingFiles []string
	pendingURLs  []string
	sink         dockDropSink
}

func newDockDropDispatcher(sink dockDropSink) *dockDropDispatcher {
	return &dockDropDispatcher{sink: sink}
}

func (d *dockDropDispatcher) MarkReady() {
	d.mu.Lock()
	d.ready = true
	files := dedupeTrimmed(d.pendingFiles)
	urls := dedupeTrimmed(d.pendingURLs)
	d.pendingFiles = nil
	d.pendingURLs = nil
	d.mu.Unlock()

	if len(files) > 0 {
		d.sink.EmitFiles(files)
	}
	if len(urls) > 0 {
		d.sink.EmitURLs(urls)
	}
	if len(files) > 0 || len(urls) > 0 {
		d.sink.PresentWindow()
	}
}

func (d *dockDropDispatcher) HandleOpenedFiles(paths []string) {
	files, urls := splitOpenedPaths(paths)
	if len(files) == 0 && len(urls) == 0 {
		return
	}

	d.mu.Lock()
	if !d.ready {
		d.pendingFiles = append(d.pendingFiles, files...)
		d.pendingURLs = append(d.pendingURLs, urls...)
		d.mu.Unlock()
		return
	}
	d.mu.Unlock()

	if len(files) > 0 {
		d.sink.EmitFiles(files)
	}
	if len(urls) > 0 {
		d.sink.EmitURLs(urls)
	}
	d.sink.PresentWindow()
}

func (d *dockDropDispatcher) HandleLaunchedURL(raw string) {
	parsed, ok := normalizeHTTPURL(raw)
	if !ok {
		return
	}

	d.mu.Lock()
	if !d.ready {
		d.pendingURLs = append(d.pendingURLs, parsed)
		d.mu.Unlock()
		return
	}
	d.mu.Unlock()

	d.sink.EmitURLs([]string{parsed})
	d.sink.PresentWindow()
}

func splitOpenedPaths(paths []string) (files []string, urls []string) {
	for _, raw := range paths {
		path := strings.TrimSpace(raw)
		if path == "" {
			continue
		}
		if shortcutURL, ok := parseLinkShortcut(path); ok {
			urls = append(urls, shortcutURL)
			continue
		}
		files = append(files, path)
	}
	return dedupeTrimmed(files), dedupeTrimmed(urls)
}

func dedupeTrimmed(items []string) []string {
	if len(items) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(items))
	result := make([]string, 0, len(items))
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func normalizeHTTPURL(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", false
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Host == "" {
		return "", false
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return "", false
	}
	return parsed.String(), true
}

func parseLinkShortcut(path string) (string, bool) {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".webloc":
		data, err := os.ReadFile(path)
		if err != nil {
			return "", false
		}
		if bytes.HasPrefix(data, []byte("bplist")) && runtime.GOOS == "darwin" {
			if converted, err := exec.Command("plutil", "-convert", "xml1", "-o", "-", path).Output(); err == nil {
				data = converted
			}
		}
		return parseWeblocXML(data)
	case ".url":
		data, err := os.ReadFile(path)
		if err != nil {
			return "", false
		}
		return parseURLShortcutINI(data)
	default:
		return "", false
	}
}

func parseWeblocXML(data []byte) (string, bool) {
	decoder := xml.NewDecoder(bytes.NewReader(data))
	var currentKey string
	var inKey, inString bool
	for {
		token, err := decoder.Token()
		if err != nil {
			return "", false
		}
		switch elem := token.(type) {
		case xml.StartElement:
			inKey = elem.Name.Local == "key"
			inString = elem.Name.Local == "string"
		case xml.EndElement:
			inKey = false
			inString = false
		case xml.CharData:
			text := strings.TrimSpace(string(elem))
			if inKey {
				currentKey = text
			} else if inString && currentKey == "URL" {
				return normalizeHTTPURL(text)
			}
		}
	}
}

func parseURLShortcutINI(data []byte) (string, bool) {
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(strings.TrimSuffix(line, "\r"))
		if len(trimmed) < 4 || !strings.EqualFold(trimmed[:4], "URL=") {
			continue
		}
		if parsed, ok := normalizeHTTPURL(trimmed[4:]); ok {
			return parsed, true
		}
	}
	return "", false
}
