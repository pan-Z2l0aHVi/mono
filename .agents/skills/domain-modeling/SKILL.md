---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the _active_ discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely _reading_ `CONTEXT.md` for project context is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## Context boundaries

`CONTEXT.md` is repository-level project context, not a glossary-only file. In this repository it may contain three clearly separated kinds of information:

- **Domain vocabulary** — canonical terms, definitions, aliases to avoid, and relationships between concepts.
- **Repository architecture context** — project identity, package boundaries, dependency direction, integration surfaces, core principles, and an index of relevant ADRs.
- **Implementation details** — current code, manifests, configuration, tests, generated output, and step-by-step procedures. Keep these in the relevant source, README, task guide, or ADR; do not copy them into `CONTEXT.md`.

When updating the model, preserve valuable repository architecture context and change only the vocabulary or architectural decision that was actually resolved. Use the existing [`CONTEXT-FORMAT.md`](./CONTEXT-FORMAT.md) for vocabulary entries and [`ADR-FORMAT.md`](./ADR-FORMAT.md) for decisions.

## File structure

Most repositories have a root `CONTEXT.md` containing project context and, when useful, domain vocabulary:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple domain contexts. The map points to where each one lives; the root `CONTEXT.md` may still retain repository-wide architecture context and ADR indexes.

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists, create one when the first project context or term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the vocabulary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your vocabulary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update the project context inline

When a term or repository-wide architectural boundary is resolved, update the appropriate section of `CONTEXT.md` right there. Do not remove unrelated architecture context. Keep implementation details in source, manifests, configuration, tests, task guides, or ADRs.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
