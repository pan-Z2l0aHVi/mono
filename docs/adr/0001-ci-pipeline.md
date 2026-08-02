# ADR-0001: CI Pipeline

- **Date**: 2025-01-01
- **Status**: Accepted

## Context

The monorepo needs a CI pipeline that catches regressions before merge and publishes packages automatically on release.

## Decision

- **CI** (`.github/workflows/ci.yml`): changeset status check → full build → format+lint+type-check → test
- **Changesets** (`.github/workflows/release.yml`): `changesets/action@v1` creates version PRs and publishes public npm packages. It also versions the private Wails workspace without publishing it to npm.
- **Wails** (`.github/workflows/wails-artifacts.yml`): native macOS/Windows builds validate desktop changes; a Wails GitHub Release is created only after a Changesets version PR updates the desktop app version on `main`.
- Demo apps excluded from versioning (they're private)

## Consequences

- CI runs `check:code` (format + lint + type-check) as a unified step before tests
- Public npm publication and desktop GitHub Releases are fully automated after their version PRs merge
- The `changeset` workflow requires conventional commit messages
