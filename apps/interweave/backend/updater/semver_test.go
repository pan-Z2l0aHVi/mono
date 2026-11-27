package updater

import "testing"

func TestParseStableSemVer(t *testing.T) {
	valid := []struct {
		raw  string
		want SemVer
	}{
		{"0.3.0", SemVer{0, 3, 0}},
		{"v1.2.3", SemVer{1, 2, 3}},
		{" 10.20.30 ", SemVer{10, 20, 30}},
	}
	for _, tc := range valid {
		got, err := ParseStableSemVer(tc.raw)
		if err != nil {
			t.Fatalf("ParseStableSemVer(%q) unexpected error: %v", tc.raw, err)
		}
		if got != tc.want {
			t.Fatalf("ParseStableSemVer(%q) = %+v, want %+v", tc.raw, got, tc.want)
		}
	}

	invalid := []string{
		"",
		"0.3",
		"0.3.0-beta.1",
		"0.3.0-rc.1",
		"0.3.0+build.1",
		"interweave-v0.3.0",
		"abc",
	}
	for _, raw := range invalid {
		if _, err := ParseStableSemVer(raw); err == nil {
			t.Fatalf("ParseStableSemVer(%q) expected error, got nil", raw)
		}
	}
}

func TestParseInterweaveReleaseTag(t *testing.T) {
	v, ok := ParseInterweaveReleaseTag("interweave-v1.4.2")
	if !ok || v != (SemVer{1, 4, 2}) {
		t.Fatalf("got (%+v, %v), want ({1 4 2}, true)", v, ok)
	}

	rejected := []string{
		"v1.4.2",
		"@greypan/web-ui@0.5.0",
		"interweave-v1.4.2-beta.1",
		"interweave-v1.4.2-rc.1",
		"interweave-1.4.2",
		"interweave-v1.4",
	}
	for _, tag := range rejected {
		if _, ok := ParseInterweaveReleaseTag(tag); ok {
			t.Fatalf("ParseInterweaveReleaseTag(%q) should be rejected", tag)
		}
	}
}

func TestSemVerCompare(t *testing.T) {
	cases := []struct {
		a, b SemVer
		want int
	}{
		{SemVer{0, 3, 0}, SemVer{0, 3, 0}, 0},
		{SemVer{0, 3, 0}, SemVer{0, 3, 1}, -1},
		{SemVer{0, 3, 1}, SemVer{0, 3, 0}, 1},
		{SemVer{0, 10, 0}, SemVer{0, 2, 9}, 1},
		{SemVer{1, 0, 0}, SemVer{0, 99, 99}, 1},
	}
	for _, tc := range cases {
		if got := tc.a.Compare(tc.b); got != tc.want {
			t.Fatalf("%s.Compare(%s) = %d, want %d", tc.a, tc.b, got, tc.want)
		}
	}
}
