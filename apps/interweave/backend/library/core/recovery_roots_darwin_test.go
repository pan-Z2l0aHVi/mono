//go:build darwin

package core

// cspell:ignore apfs journaled nobrowse devfs autofs exfat nodev smbfs

import (
	"slices"
	"strings"
	"testing"
)

func TestDarwinMountScanBoundaries(t *testing.T) {
	mounts := `/dev/disk3s1 on / (apfs, sealed, local, read-only)
/dev/disk3s5 on /System/Volumes/Data (apfs, local, journaled, nobrowse)
/dev/disk3s6 on /System/Volumes/VM (apfs, local, nobrowse)
devfs on /dev (devfs, local, nobrowse)
map auto_home on /System/Volumes/Data/home (autofs, automounted, nobrowse)
/dev/disk4s1 on /Volumes/External Disk (exfat, local, nodev)
//host/share on /Volumes/Network (smbfs, nodev)
`
	roots, excluded, err := parseDarwinMounts(strings.NewReader(mounts))
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{"/", "/System/Volumes/Data", "/Volumes/External Disk"} {
		if !slices.Contains(roots, p) {
			t.Errorf("local volume %s missing: %v", p, roots)
		}
	}
	for _, p := range []string{"/System/Volumes/VM", "/dev", "/System/Volumes/Data/home", "/Volumes/Network"} {
		if !excluded[p] {
			t.Errorf("virtual or network mount %s not excluded", p)
		}
	}
}
