//go:build darwin

package core

// cspell:ignore apfs exfat msdos

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os/exec"
	"strings"
)

func localScanRoots() ([]string, map[string]bool, error) {
	out, err := exec.Command("/sbin/mount").Output()
	if err != nil {
		return nil, nil, err
	}
	return parseDarwinMounts(bytes.NewReader(out))
}

func parseDarwinMounts(input io.Reader) ([]string, map[string]bool, error) {
	roots := []string{}
	excluded := map[string]bool{}
	scanner := bufio.NewScanner(input)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, " on ", 2)
		if len(parts) != 2 {
			continue
		}
		fields := strings.SplitN(parts[1], " (", 2)
		if len(fields) != 2 {
			continue
		}
		path := cleanMountPath(fields[0])
		opts := strings.Split(strings.TrimSuffix(fields[1], ")"), ", ")
		local := false
		for _, opt := range opts {
			if opt == "local" {
				local = true
			}
		}
		localType := len(opts) > 0 && (opts[0] == "apfs" || opts[0] == "hfs" || opts[0] == "exfat" || opts[0] == "msdos" || opts[0] == "ntfs")
		systemVolume := strings.HasPrefix(path, "/System/Volumes/") && path != "/System/Volumes/Data" && !strings.HasPrefix(path, "/System/Volumes/Data/")
		if local && localType && !systemVolume {
			roots = append(roots, path)
		} else {
			excluded[path] = true
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, nil, err
	}
	if len(roots) == 0 {
		return nil, nil, fmt.Errorf("no local disks found")
	}
	return roots, excluded, nil
}
