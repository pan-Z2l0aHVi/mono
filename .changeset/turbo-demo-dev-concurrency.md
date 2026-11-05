---
---

Raise `--concurrency` to 20 on the react and vue demo dev scripts: their dependency closure runs 13 persistent watch tasks, above turbo 2.11's default concurrency of 10, which made both scripts fail to start.
