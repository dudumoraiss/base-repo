---
name: spec-workflow
description: Use when implementing a non-trivial feature in this repo. A lightweight spec → plan → implement → test loop that produces a short written spec under docs/specs/ before code. Keeps changes intentional without heavyweight process.
---

# Spec-driven workflow

Lightweight on purpose: a spec is a paragraph or two plus a checklist, not a
design doc. It supports tests and good engineering — it does not replace them.

## Loop

1. **Spec.** Copy `docs/specs/TEMPLATE.md` to `docs/specs/NNNN-<slug>.md` and
   fill it in: problem, scope (in/out), interface/contract, acceptance criteria.
   Keep it short. See `docs/specs/0001-observability.md` for a worked example.
2. **Plan.** Identify the layers touched (domain / application / infra / DI) and
   which project(s). Name the files. Confirm boundaries aren't violated.
3. **Implement.** Smallest change that satisfies the spec. Put logic in the
   application layer; keep adapters thin. Wire concretes only at the composition
   root / DI.
4. **Test.** Add unit tests in the same change, asserting the acceptance criteria.
   Mock collaborators. Run `nx run-many -t lint test build`.
5. **Audit.** Run the `code-auditor` agent on the diff before opening the PR.

## When to skip the spec

Typos, copy tweaks, dependency bumps, and one-line fixes don't need a spec. Use
judgement — the spec exists to make intent reviewable, not to add friction.

## What a good acceptance criterion looks like

- "GET /health returns `{ status: 'ok', service: 'api' }` and emits exactly one
  `info` log with message `health check`."
- "`redact` masks any key containing `token` (case-insensitive), including nested
  objects, without mutating the input."

Concrete and testable. If you can't write the test from the criterion, the
criterion is too vague.
