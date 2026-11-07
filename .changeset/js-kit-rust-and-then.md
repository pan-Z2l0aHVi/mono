---
'@greypan/js-kit': minor
---

Add `rust.andThen(result, next)`: Rust's `Result::and_then`. On `Ok` it hands the payload to `next` and takes
that call's result as its own; on `Err` it returns the error untouched and never runs `next`. It accepts a
`Result` or a promise of one, so an async step chains without an `await` at every link. The name stays
camelCase like the rest of the paradigm module (`isOk`, not `is_ok`) — the deviation from Rust is spelling,
not semantics.
