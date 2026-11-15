//go:build windows

package core

import (
	"fmt"
	"golang.org/x/sys/windows"
)

func localScanRoots() ([]string, map[string]bool, error) {
	mask, err := windows.GetLogicalDrives()
	if err != nil {
		return nil, nil, err
	}
	roots := []string{}
	for i := 0; i < 26; i++ {
		if mask&(1<<i) == 0 {
			continue
		}
		p := fmt.Sprintf("%c:\\", 'A'+i)
		ptr, _ := windows.UTF16PtrFromString(p)
		t := windows.GetDriveType(ptr)
		if t == windows.DRIVE_FIXED || t == windows.DRIVE_REMOVABLE {
			roots = append(roots, p)
		}
	}
	if len(roots) == 0 {
		return nil, nil, fmt.Errorf("no local disks found")
	}
	return roots, map[string]bool{}, nil
}
