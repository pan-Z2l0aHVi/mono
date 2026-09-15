# Turborepo does not relay terminal query replies back to its tasks

A build task that asks the terminal for its background colour never receives the answer, and the
answer lands in the terminal as control-sequence garbage instead.

This is the mechanism behind
[voidzero-dev/vite-plus#2697](https://github.com/voidzero-dev/vite-plus/issues/2697). That report
blames `vite-plus`, and `vite-plus` is not involved: no `vp` command writes a terminal query. The
CLI that writes the query in the original project is `wails3` (Go, lipgloss/termenv). The part
that loses the answer is the task runner.

## Reproduce

```sh
pnpm install
pnpm run build
```

In iTerm2, Ghostty or Terminal.app, the terminal's reply is printed as noise:

```text
11;rgb:ffff/ffff/ffff;37R
```

`packages/osc11-query/src/query-terminal.mjs` is a 25-line stand-in for any CLI that probes the
terminal background: on a TTY it writes `ESC ] 11 ; ? ST` followed by a DSR cursor-position query
`ESC [ 6 n`, then reads stdin for the answer. Run directly it gets and consumes the answer. Run as
a Turborepo task it does not, and the reply surfaces in the terminal.

The task's cache is disabled (`@greypan/osc11-query#build` in `turbo.json`) so every
`pnpm run build` reproduces without `--force`.

## Reproduce without a human at a terminal

```sh
pnpm run probe            # emitter as a turbo task -> 1 query, answer leaks   (exit 1)
pnpm run probe:control    # same file on its own    -> answer consumed          (exit 0)
pnpm run probe:vite-plus  # `vp build` as a task    -> no query written          (exit 0)
```

`tools/osc-probe.py` runs a command in a sized PTY, answers OSC 11 and DSR queries the way a
terminal emulator does, and scores the finished byte stream. Exit status is 1 when an answer came
back around as output. Useful flags: `--no-respond` (watch without answering), `--delay <ms>`
(answer late, to catch a tool that stops listening), `--no-echo` plus a trailing `read` (prove the
answer is still sitting in the input queue), `--analyze <file>` (score a `script -q` recording
taken in a real terminal), `OSC_PROBE_DUMP=<path>`, `OSC_PROBE_TIMEOUT=<s>`.

## Mechanism

1. Turborepo gives each task a PTY and forwards its output so colours survive, so the query
   reaches the terminal emulator.
2. The emulator writes its answer into the terminal, which delivers it to the **runner's** stdin.
   The runner does not write it back into the task's PTY master.
3. Nobody reads it, so the tty line discipline echoes it into the visible stream, and the answer
   to the DSR query arrives with it: `11;rgb:ffff/ffff/ffff` + `[37R`.

Measured with Turborepo 2.10.12 in the default UI and with `--ui=stream`. In `--ui=tui` the query
bytes are filtered out of the runner's own output and only reach `.turbo/turbo-build.log`, so the
emulator is never asked and nothing leaks - which is why switching UI modes looked inconclusive,
and why the TUI appeared clean.

Runner-side options: relay the pending input into the task's PTY, drain unread input when a task
exits, or fence queries with a DA1/DSR read so an unanswered probe cannot leave bytes behind.

## Environment

| Component | Version                                                              |
| --------- | -------------------------------------------------------------------- |
| pnpm      | 12.4.0 (`packageManager`, `engines.pnpm`)                            |
| Node      | 24.18.0 (`.mise.toml`)                                               |
| Turborepo | `^2.10.11` (resolved 2.10.12)                                        |
| vite-plus | `0.3.0`, with `vite` aliased to `@voidzero-dev/vite-plus-core@0.3.0` |
| Terminals | iTerm2, Ghostty, Terminal.app                                        |

## What was measured

| Subject                                                       | queries written        | answer reached the writer | noise |
| ------------------------------------------------------------- | ---------------------- | ------------------------- | ----- |
| `query-terminal.mjs` on its own in a PTY                      | OSC 11 + DSR           | yes                       | no    |
| same file as a `turbo build` task (default UI)                | OSC 11 + DSR           | no                        | yes   |
| same file, `turbo build --ui=stream`                          | OSC 11 + DSR           | no                        | yes   |
| same file, `turbo build --ui=tui`                             | filtered by the runner | no                        | no    |
| `vp build`, `vp pack`, `vp test run` as turbo tasks           | none                   | -                         | no    |
| `wails3 v3.0.0-beta.12` steps as turbo tasks (source project) | OSC 11 + DSR x6        | no                        | yes   |
| `wails3 task --list` on its own in a PTY                      | OSC 11 + DSR           | yes                       | no    |

The `wails3` rows are what the original report observed. Everything else in this workspace -
`vp`, `pnpm`, `mise` - writes no query: neither `vite-plus.darwin-arm64.node` nor the pnpm bundle
contains an OSC 11 sequence at byte level, and `vp build` writes none even when its stdout is a
PTY and the answer is delivered immediately.

## Layout

```text
package.json                          turbo build/test entry points + probe scripts
turbo.json                            task graph, cache disabled for the query task
pnpm-workspace.yaml                   versions, `vite` -> vite-plus-core alias
packages/osc11-query                  the terminal query, as a build task
packages/js-kit                       real vite-plus library build (the innocent suspect)
packages/tsconfig                     shared tsconfig profiles for js-kit
tools/osc-probe.py                    PTY probe that answers OSC 11 / DSR queries
tools/osc-query-control.mjs           known emitter that leaves its answer unread, probe self-check
```

Reduced from [pan-Z2l0aHVi/mono](https://github.com/pan-Z2l0aHVi/mono), the project where the
noise was first reported; `apps/interweave` there is what supplied the `wails3` rows above.
