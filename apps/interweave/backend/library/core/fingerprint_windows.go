//go:build windows

package core

import (
	"fmt"
	"golang.org/x/sys/windows"
	"os"
)

func fileIdentity(path string, _ os.FileInfo) (string, int64) {
	p, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return "", 0
	}
	h, err := windows.CreateFile(p, windows.FILE_READ_ATTRIBUTES, windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE|windows.FILE_SHARE_DELETE, nil, windows.OPEN_EXISTING, windows.FILE_ATTRIBUTE_NORMAL, 0)
	if err != nil {
		return "", 0
	}
	defer windows.CloseHandle(h)
	var info windows.ByHandleFileInformation
	if windows.GetFileInformationByHandle(h, &info) != nil {
		return "", 0
	}
	if info.FileIndexHigh == 0 && info.FileIndexLow == 0 {
		return "", 0
	}
	return fmt.Sprintf("%d:%d:%d", info.VolumeSerialNumber, info.FileIndexHigh, info.FileIndexLow), 0
}
