//go:build darwin

package service

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework AppKit
#include <AppKit/AppKit.h>
#include <stdlib.h>

static char *copy_clipboard_html(void) {
	@autoreleasepool {
		NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
		NSString *value = [pasteboard stringForType:NSPasteboardTypeHTML];
		if (value == nil) {
			return strdup("");
		}
		return strdup(value.UTF8String);
	}
}

static char *copy_clipboard_source_url(void) {
	@autoreleasepool {
		NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
		NSString *value = [pasteboard stringForType:NSPasteboardTypeURL];
		if (value == nil) {
			return strdup("");
		}
		return strdup(value.UTF8String);
	}
}
*/
import "C"

import (
	"context"
	"unsafe"
)

// readClipboardHTML 读取富文本 HTML；复制来源地址存在时作为相对链接的 base。
// 剪贴板没有 HTML 是正常状态，返回空串而不是错误。
func readClipboardHTML(context.Context) (string, string, error) {
	html := C.copy_clipboard_html()
	baseURL := C.copy_clipboard_source_url()
	if html == nil || baseURL == nil {
		if html != nil {
			C.free(unsafe.Pointer(html))
		}
		if baseURL != nil {
			C.free(unsafe.Pointer(baseURL))
		}
		return "", "", nil
	}
	defer C.free(unsafe.Pointer(html))
	defer C.free(unsafe.Pointer(baseURL))
	return C.GoString(html), C.GoString(baseURL), nil
}
