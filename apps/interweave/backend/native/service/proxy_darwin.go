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

// 按请求 URL 查询 macOS 系统代理，返回原始代理类型与地址 "<proxyType>|host[:port]" 或 NULL（显式直连 / 无代理）。
// proxyType 到 Go http.Transport scheme 的协议映射由 proxy_shared.go 的 resolveDarwinProxy 统一完成并受单测保护。
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
			NSString *proxyType = nil;
			if ([type isEqualToString:(NSString *)kCFProxyTypeNone]) {
				// 绕过列表命中：这一条 URL 显式直连。
				return NULL;
			}
			if ([type isEqualToString:(NSString *)kCFProxyTypeHTTPS]) {
				proxyType = @"https";
			} else if ([type isEqualToString:(NSString *)kCFProxyTypeHTTP]) {
				proxyType = @"http";
			} else if ([type isEqualToString:(NSString *)kCFProxyTypeSOCKS]) {
				proxyType = @"socks5";
			} else {
				// PAC（kCFProxyTypeAutoConfigURL）不计算：跳过，交给环境变量回落。
				continue;
			}
			if (host.length == 0) {
				continue;
			}
			NSString *result = port == nil
				? [NSString stringWithFormat:@"%@|%@", proxyType, host]
				: [NSString stringWithFormat:@"%@|%@:%@", proxyType, host, port];
			return strdup(result.UTF8String);
		}
		return NULL;
	}
}
*/
import "C"

import (
	"net/http"
	"net/url"
	"unsafe"
)

func defaultPlatformProxyLookup() systemProxyLookup {
	return func(req *http.Request) (*url.URL, error) {
		return resolveDarwinProxy(req, queryDarwinSystemProxy)
	}
}

func queryDarwinSystemProxy(rawURL string) (string, bool) {
	// C.CString 的输入指针必须释放：代理解析每请求都会走这里，不 free 会持续泄漏。
	cURL := C.CString(rawURL)
	defer C.free(unsafe.Pointer(cURL))
	cResult := C.copy_system_proxy_for_url(cURL)
	if cResult == nil {
		return "", false
	}
	defer C.free(unsafe.Pointer(cResult))
	return C.GoString(cResult), true
}
