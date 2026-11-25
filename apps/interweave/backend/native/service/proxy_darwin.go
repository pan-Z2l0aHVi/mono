//go:build darwin

// cspell:ignore CFURL

package service

/*
#cgo LDFLAGS: -framework Foundation -framework CoreFoundation -framework CFNetwork
#import <Foundation/Foundation.h>
#import <CoreFoundation/CoreFoundation.h>
#import <CFNetwork/CFNetwork.h>
#import <CFNetwork/CFProxySupport.h>
#include <stdlib.h>

// 按请求 URL 解析 macOS 系统代理，返回 "scheme|host[:port]" 或 NULL（显式直连 / 无代理）。
static char *copy_system_proxy_for_url(const char *urlString) {
	@autoreleasepool {
		NSString *string = [NSString stringWithUTF8String:urlString];
		NSURL *requestURL = string ? [NSURL URLWithString:string] : nil;
		if (requestURL == nil) {
			return NULL;
		}
		NSDictionary *settings = CFBridgingRelease(CFNetworkCopySystemProxySettings());
		if (settings == nil) {
			return NULL;
		}
		NSArray *proxies = CFBridgingRelease(CFNetworkCopyProxiesForURL((__bridge CFURLRef)requestURL, (__bridge CFDictionaryRef)settings));
		for (NSDictionary *proxy in proxies) {
			NSString *type = proxy[(NSString *)kCFProxyTypeKey];
			NSString *host = proxy[(NSString *)kCFProxyHostNameKey];
			NSNumber *port = proxy[(NSString *)kCFProxyPortNumberKey];
			NSString *scheme = nil;
			if ([type isEqualToString:(NSString *)kCFProxyTypeNone]) {
				// 绕过列表命中：这一条 URL 显式直连。
				return NULL;
			}
			if ([type isEqualToString:(NSString *)kCFProxyTypeHTTPS]) {
				scheme = @"https";
			} else if ([type isEqualToString:(NSString *)kCFProxyTypeHTTP]) {
				scheme = @"http";
			} else if ([type isEqualToString:(NSString *)kCFProxyTypeSOCKS]) {
				scheme = @"socks5";
			} else {
				// PAC（kCFProxyTypeAutoConfigURL）不计算：跳过，交给环境变量回落。
				continue;
			}
			if (host.length == 0) {
				continue;
			}
			NSString *result = port == nil
				? [NSString stringWithFormat:@"%@|%@", scheme, host]
				: [NSString stringWithFormat:@"%@|%@:%@", scheme, host, port];
			return strdup(result.UTF8String);
		}
		return NULL;
	}
}
*/
import "C"

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"unsafe"
)

// systemProxyFor 按 macOS 系统设置解析代理；设置不可读或显式直连都返回 (nil, nil)。
func systemProxyFor(req *http.Request) (*url.URL, error) {
	if req.URL == nil {
		return nil, fmt.Errorf("proxy: request has no URL")
	}
	// C.CString 的输入指针必须释放：代理解析每请求都会走这里，不 free 会持续泄漏。
	cURL := C.CString(req.URL.String())
	defer C.free(unsafe.Pointer(cURL))
	cResult := C.copy_system_proxy_for_url(cURL)
	if cResult == nil {
		return nil, nil
	}
	defer C.free(unsafe.Pointer(cResult))
	scheme, host, found := strings.Cut(C.GoString(cResult), "|")
	if !found || host == "" {
		return nil, fmt.Errorf("proxy: malformed system proxy result %q", C.GoString(cResult))
	}
	return &url.URL{Scheme: scheme, Host: host}, nil
}
