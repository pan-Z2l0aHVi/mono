---
---

Internal change: rewrites the `@greypan/unplugin-web-components`, `@greypan/test-kit` and `@greypan/deps-reload` test suites against the new test policy — drops assertions on plugin internals (hook wiring, handler registration order, wrapper shape, `Set` size), deletes a case guarding an unreachable `escapeRegExp` branch, merges duplicated cases into parameterized tables, and rewrites the rest into behaviour-level assertions; adds a mutation-check pass in which all 29 injected production-code defects are caught. No published package behaviour is affected.
