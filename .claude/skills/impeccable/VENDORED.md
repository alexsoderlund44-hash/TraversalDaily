# Vendored: Impeccable

This skill and the `impeccable-*` agents in `.claude/agents/` are copied unmodified from
[pbakaus/impeccable](https://github.com/pbakaus/impeccable) v4.5.0
(commit 778c8a7b71ccd5bfe3ca6ac68c15d9d872d0f87d), by Paul Bakaus, under the Apache 2.0
license (see LICENSE and NOTICE.md in this folder).

Use it in Claude Code with `/impeccable <command> [target]`, for example
`/impeccable critique play.html` or `/impeccable polish css/atlas.css`.
Run `/impeccable` alone to see every command.

The upstream optional hooks (a design check after every edit and at the end of each turn)
are not enabled here. To update, re-copy `.claude/skills/impeccable` and
`.claude/agents/impeccable-*.md` from a newer upstream checkout.
