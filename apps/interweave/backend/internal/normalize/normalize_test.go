package normalize_test

import (
	"testing"

	"github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/internal/normalize"
)

func TestTagName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
		wantErr  bool
	}{
		{"  Tokyo  ", "Tokyo", false},
		{"Tokyo   Travel", "Tokyo Travel", false},
		{"  #ios-dev  ", "#ios-dev", false},
		{"   ", "", true},
		{"", "", true},
		{"  人工智能  ", "人工智能", false},
		{"iOS", "iOS", false},
	}

	for _, tt := range tests {
		got, err := normalize.TagName(tt.input)
		if (err != nil) != tt.wantErr {
			t.Errorf("TagName(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			continue
		}
		if got != tt.expected {
			t.Errorf("TagName(%q) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}

func TestURL(t *testing.T) {
	tests := []struct {
		input    string
		expected string
		wantErr  bool
	}{
		{"  https://Example.COM:443/Path?q=1#frag ", "https://example.com/Path?q=1#frag", false},
		{"http://TEST.org:80", "http://test.org/", false},
		{"http://test.org:8080/foo", "http://test.org:8080/foo", false},
		{"ftp://example.com", "", true},
		{"not a url", "", true},
		{"", "", true},
	}

	for _, tt := range tests {
		got, err := normalize.URL(tt.input)
		if (err != nil) != tt.wantErr {
			t.Errorf("URL(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			continue
		}
		if got != tt.expected {
			t.Errorf("URL(%q) = %q, want %q", tt.input, got, tt.expected)
		}
	}
}
