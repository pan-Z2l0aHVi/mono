---
---

Internal change: no published package is affected. `common:generate:icons` generated the DMG volume icon next to the app icons, so the Windows build job — which depends on that same shared task — had to run `wails3 generate icons … -windowsfilename /tmp/interweave-dmg-icon.ico`, a POSIX absolute path, and every Windows verify and release build has failed since `8280ca52`. The volume icon now belongs to `darwin:generate:dmg-icon`, hanging off its only consumer `create:dmg` and suppressing the default `.ico` with `-windowsfilename=` instead of a throwaway path, so it stays correct when cross-compiling from macOS too. `node apps/interweave/scripts/check-build-tasks.mjs` fails the PR job if a command in the shared Taskfile grows an absolute path again.
