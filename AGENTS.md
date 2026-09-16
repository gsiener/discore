# AGENTS.md

Instructions for coding agents working in this repository. See `CLAUDE.md` for
architecture and development commands.

## Friction Log

This project uses [Frog](https://frog.fm) to track friction — the papercuts,
workarounds, and dead ends you hit while working here.

- Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with `npx frog log`.
- Do not add global, system, or internal friction.
- Run `npx frog list` first to see what is already known.

Entries live in `.agents/friction-log/` and commit alongside the change that
provoked them. The GitHub Actions workflow (`.github/workflows/friction-log.yml`)
reports each entry as an issue and opens a `frog/sync` pull request deleting
entries whose issues have closed.
