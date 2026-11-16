//go:build darwin

package service

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework AppKit
#include <AppKit/AppKit.h>
#include <stdlib.h>

static char *copy_clipboard_text(void) {
	@autoreleasepool {
		NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
		NSString *value = [pasteboard stringForType:NSPasteboardTypeString];
		if (value == nil) {
			return strdup("");
		}
		return strdup(value.UTF8String);
	}
}

static bool write_clipboard_text(const char *value) {
	@autoreleasepool {
		NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
		[pasteboard clearContents];
		NSString *text = [NSString stringWithUTF8String:value];
		if (text == nil) {
			return false;
		}
		return [pasteboard setString:text forType:NSPasteboardTypeString];
	}
}
*/
import "C"

import (
	"context"
	"fmt"
	"unsafe"
)

func readClipboardText(context.Context) (string, error) {
	result := C.copy_clipboard_text()
	if result == nil {
		return "", fmt.Errorf("read macOS clipboard text: NSPasteboard returned no buffer")
	}
	// 释放用 C.free 而不是另一个文件里的 free_clipboard_string：cgo 的每个 Go 文件各有
	// 一份 static 前导，跨文件引用不到。
	defer C.free(unsafe.Pointer(result))
	return C.GoString(result), nil
}

func writeClipboardText(_ context.Context, text string) error {
	value := C.CString(text)
	defer C.free(unsafe.Pointer(value))
	if !C.write_clipboard_text(value) {
		return fmt.Errorf("write macOS clipboard text: NSPasteboard rejected the string")
	}
	return nil
}
