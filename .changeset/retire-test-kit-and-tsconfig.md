---
---

`@greypan/test-kit` and `@greypan/tsconfig` are internal-only workspace packages and are not published to npm. Both manifests set `private: true`, so `changeset publish` skips them, and in-repository consumers resolve them through the `workspace:*` protocol. The publish-only `files` allowlists are gone; nothing in either package is meant to be packed.
