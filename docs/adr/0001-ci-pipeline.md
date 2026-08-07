# ADR-0001: CI Pipeline

- **Date**: 2025-01-01
- **Status**: Accepted

## Context

The monorepo needs a CI pipeline that catches regressions before merge and publishes packages automatically on release.

## Decision

- **CI** (`.github/workflows/ci.yml`): changeset status check → full build → format+lint+type-check → test
- **Create Version PR** (`.github/workflows/changeset-version.yml`): `changesets/action@v1` creates version PRs only. It versions the private Wails workspace without publishing it to npm.
- **Publish npm Packages** (`.github/workflows/npm-publish.yml`): a merged version PR rebuilds and publishes public packages through npm Trusted Publishing.
- **Verify Wails Desktop** (`.github/workflows/wails-verify.yml`): native macOS/Windows builds validate desktop pull requests and manual runs with read-only permissions.
- **Release Wails Desktop** (`.github/workflows/wails-release.yml`): a merged version PR rebuilds both installers and creates the Wails GitHub Release.
- Demo apps excluded from versioning (they're private)

## Consequences

- CI runs `check:code` (format + lint + type-check) as a unified step before tests
- npm publication and desktop GitHub Releases are independent, parallel release planes after their version PR merges
- The `changeset` workflow requires conventional commit messages
