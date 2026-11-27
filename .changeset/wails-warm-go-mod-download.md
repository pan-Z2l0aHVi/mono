---
---

Use `go mod download` instead of `go vet ./...` in `warm-wails-caches` before platform production `go build` so Windows baseline cache warmup does not fail on Unix-only test files.
