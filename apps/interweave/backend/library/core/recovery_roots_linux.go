//go:build linux

package core

// cspell:ignore btrfs vfat exfat apfs hfsplus

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func localScanRoots() ([]string, map[string]bool, error) {
	f, err := os.Open("/proc/self/mountinfo")
	if err != nil {
		return nil, nil, err
	}
	defer f.Close()
	local := map[string]bool{}
	excluded := map[string]bool{}
	scanner := bufio.NewScanner(f)
	// Restrict full-disk scanning to known local filesystem types.
	types := map[string]bool{"ext2": true, "ext3": true, "ext4": true, "xfs": true, "btrfs": true, "vfat": true, "exfat": true, "ntfs": true, "ntfs3": true, "f2fs": true, "zfs": true, "apfs": true, "hfsplus": true}
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) < 7 {
			continue
		}
		sep := -1
		for i, v := range fields {
			if v == "-" {
				sep = i
				break
			}
		}
		if sep < 0 || sep+1 >= len(fields) {
			continue
		}
		p := cleanMountPath(fields[4])
		if types[fields[sep+1]] {
			local[p] = true
		} else {
			excluded[p] = true
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, nil, err
	}
	roots := make([]string, 0, len(local))
	for p := range local {
		roots = append(roots, p)
		delete(excluded, p)
	}
	if len(roots) == 0 {
		return nil, nil, fmt.Errorf("no local disks found")
	}
	return roots, excluded, nil
}
