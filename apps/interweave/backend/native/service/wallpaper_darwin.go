//go:build darwin

package service

/*
#cgo LDFLAGS: -framework AppKit
#import <AppKit/AppKit.h>
#include <stdlib.h>

// 逐屏设置桌面壁纸（比例缩放填充），返回 NULL 表示全部成功，否则返回错误消息。
static char *set_desktop_wallpaper(const char *path) {
	@autoreleasepool {
		NSString *string = [NSString stringWithUTF8String:path];
		NSURL *fileURL = string ? [NSURL fileURLWithPath:string] : nil;
		if (fileURL == nil) {
			return strdup("wallpaper: invalid path");
		}
		NSDictionary *options = @{NSWorkspaceDesktopImageScalingKey: @(NSImageScaleProportionallyUpOrDown)};
		for (NSScreen *screen in [NSScreen screens]) {
			NSError *error = nil;
			if (![[NSWorkspace sharedWorkspace] setDesktopImageURL:fileURL forScreen:screen options:options error:&error]) {
				NSString *message = error.localizedDescription ?: @"set desktop image failed";
				return strdup(message.UTF8String);
			}
		}
		return NULL;
	}
}
*/
import "C"

import (
	"fmt"
	"unsafe"
)

// setWallpaperFromFile 经 NSWorkspace 逐屏设置壁纸；填充缩放，所有屏幕同一张。
func setWallpaperFromFile(path string) error {
	// 同 proxy_darwin：输入指针必须释放，路径随资源切换频繁传入。
	cPath := C.CString(path)
	defer C.free(unsafe.Pointer(cPath))
	cResult := C.set_desktop_wallpaper(cPath)
	if cResult == nil {
		return nil
	}
	defer C.free(unsafe.Pointer(cResult))
	return fmt.Errorf("wallpaper: %s", C.GoString(cResult))
}
