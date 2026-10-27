//go:build darwin

package service

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework AppKit
#include <AppKit/AppKit.h>
#include <stdlib.h>

static char *copy_default_open_with(const char *target, int is_url) {
	@autoreleasepool {
		NSString *string = [NSString stringWithUTF8String:target];
		if (string == nil) {
			return NULL;
		}
		NSURL *url = is_url ? [NSURL URLWithString:string] : [NSURL fileURLWithPath:string];
		if (url == nil) {
			return NULL;
		}

		NSURL *application = [[NSWorkspace sharedWorkspace] URLForApplicationToOpenURL:url];
		if (application == nil) {
			return NULL;
		}
		NSString *name = [[NSFileManager defaultManager] displayNameAtPath:application.path];
		if ([name hasSuffix:@".app"]) {
			name = [name stringByDeletingPathExtension];
		}
		if (name.length == 0) {
			return NULL;
		}
		return strdup(name.UTF8String);
	}
}
*/
import "C"

import (
	"context"
	"fmt"
	"unsafe"
)

func defaultOpenWithName(_ context.Context, target string, isURL bool) (string, error) {
	cTarget := C.CString(target)
	defer C.free(unsafe.Pointer(cTarget))

	isURLFlag := C.int(0)
	if isURL {
		isURLFlag = 1
	}
	result := C.copy_default_open_with(cTarget, isURLFlag)
	if result == nil {
		return "", fmt.Errorf("resolve the default application for %q", target)
	}
	defer C.free(unsafe.Pointer(result))
	return C.GoString(result), nil
}
