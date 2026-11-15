//go:build !linux && !darwin && !windows

package core

import "errors"

func localScanRoots() ([]string, map[string]bool, error) {
	return nil, nil, errors.New("full disk scan unsupported on this platform")
}
