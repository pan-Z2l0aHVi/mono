---
'@greypan/monorepo-kit': minor
---

Remove the `defineTestPortCallSites` and `TestPortCallSitesOptions` exports and migrate `./vite` `testPorts()` to zero-config deterministic SHA-256 hash slotting (`23410..49140` in 10-port bands with automatic linked worktree isolation via `.git` file probing and `realpathSync(root)`).
