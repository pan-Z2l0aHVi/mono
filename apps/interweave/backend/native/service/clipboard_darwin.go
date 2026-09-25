//go:build darwin

package service

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework AppKit
#include <AppKit/AppKit.h>
#include <stdlib.h>

static char *copy_clipboard_file_paths(void) {
	@autoreleasepool {
		NSPasteboard *pasteboard = [NSPasteboard generalPasteboard];
		NSArray<NSURL *> *urls = [pasteboard
			readObjectsForClasses:@[ [NSURL class] ]
			options:@{ NSPasteboardURLReadingFileURLsOnlyKey: @YES }];
		if (urls == nil) {
			return strdup("[]");
		}

		NSMutableArray<NSString *> *paths = [NSMutableArray arrayWithCapacity:urls.count];
		for (NSURL *url in urls) {
			if (url.isFileURL && url.path.length > 0) {
				[paths addObject:url.path];
			}
		}
		NSData *data = [NSJSONSerialization dataWithJSONObject:paths options:0 error:nil];
		if (data == nil) {
			return NULL;
		}
		NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
		return strdup(json.UTF8String);
	}
}

static void free_clipboard_string(char *value) {
	free(value);
}
*/
import "C"

import (
	"context"
	"encoding/json"
	"fmt"
)

func readClipboardFilePaths(context.Context) ([]string, error) {
	result := C.copy_clipboard_file_paths()
	if result == nil {
		return nil, fmt.Errorf("read macOS clipboard file paths: NSPasteboard returned no file URLs")
	}
	defer C.free_clipboard_string(result)

	var paths []string
	if err := json.Unmarshal([]byte(C.GoString(result)), &paths); err != nil {
		return nil, fmt.Errorf("decode macOS clipboard file paths: %w", err)
	}
	return paths, nil
}
