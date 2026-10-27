//go:build windows

package service

import (
	"context"
	"fmt"
	"net/url"
	"path/filepath"
	"syscall"
	"unsafe"
)

const (
	assocFNone              = 0
	assocStrFriendlyAppName = 4
	hresultPointer          = 0x80004003
	hresultFalse            = 1
)

var procAssocQueryStringW = syscall.NewLazyDLL("shlwapi.dll").NewProc("AssocQueryStringW")

func defaultOpenWithName(_ context.Context, target string, isURL bool) (string, error) {
	association := target
	if isURL {
		parsed, err := url.Parse(target)
		if err != nil {
			return "", fmt.Errorf("parse URL %q: %w", target, err)
		}
		if parsed.Scheme == "" {
			return "", fmt.Errorf("missing URL scheme for %q", target)
		}
		association = parsed.Scheme
	} else {
		extension := filepath.Ext(target)
		if extension == "" {
			return "", fmt.Errorf("file path %q has no extension", target)
		}
		association = extension
	}

	associationPtr, err := syscall.UTF16PtrFromString(association)
	if err != nil {
		return "", fmt.Errorf("encode association %q: %w", association, err)
	}

	size := uint32(256)
	for {
		buffer := make([]uint16, size)
		hresult, _, _ := procAssocQueryStringW.Call(
			assocFNone,
			assocStrFriendlyAppName,
			uintptr(unsafe.Pointer(associationPtr)),
			0,
			uintptr(unsafe.Pointer(&buffer[0])),
			uintptr(unsafe.Pointer(&size)),
		)
		switch uint32(hresult) {
		case 0:
			name := syscall.UTF16ToString(buffer)
			if name == "" {
				return "", fmt.Errorf("no default application found for %q", association)
			}
			return name, nil
		case hresultPointer:
			if size <= uint32(len(buffer)) {
				return "", fmt.Errorf("query default application for %q: buffer size did not grow", association)
			}
		case hresultFalse:
			return "", fmt.Errorf("no default application associated with %q", association)
		default:
			return "", fmt.Errorf("query default application for %q: HRESULT 0x%08x", association, uint32(hresult))
		}
	}
}
