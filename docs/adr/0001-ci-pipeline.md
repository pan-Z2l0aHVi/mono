# ADR-0001: CI Pipeline

- **Date**: 2025-01-01
- **Status**: Accepted

## Context

The monorepo needs a CI pipeline that catches regressions before merge and publishes packages automatically on release.

## Decision

- **CI** (`.github/workflows/ci.yml`): changeset status check → full build → format+lint+type-check → test
- **Release** (`.github/workflows/release.yml`): Changesets with `changesets/action@v1` — merges version PRs and publishes to npm
- Demo apps excluded from versioning (they're private)

## Consequences

- CI runs `check:code` (format + lint + type-check) as a unified step before tests
- Release is fully automated — no manual npm publish
- The `changeset` workflow requires conventional commit messages
