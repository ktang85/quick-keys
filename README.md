# quick-keys

[English](README.md) · [简体中文](README.zh-CN.md)

A Claude Code mod that draws a row of number-key shortcuts just above the prompt
box. Press `1` from an empty prompt and `/code-review ` is typed in for you;
press the one bound to `submit` and it sends a whole turn on its own. The
shortcuts are yours to change: `/keys` opens a pane where you add, retype, flip
or remove each one, and what you set is kept across sessions.

[![Watch the intro and install guide](docs/intro-preview.gif)](https://github.com/ktang85/quick-keys/blob/main/docs/intro-en.mp4)

> The clip above is a silent 4s preview. Click it for the full 32s video with narration and subtitles, or [download the file](https://github.com/ktang85/quick-keys/raw/main/docs/intro-en.mp4).

It ships with four, which you are meant to replace:

| Key | Label    | Kind   | What it does                                       |
| --- | -------- | ------ | -------------------------------------------------- |
| `1` | review   | fill   | types `/code-review ` into the prompt box          |
| `2` | simplify | fill   | types `/simplify `                                 |
| `3` | security | fill   | types `/security-review `                          |
| `4` | recap    | submit | sends "Recap what you changed so far in this session, file by file." |

`fill` puts the text in the prompt box and leaves the cursor there, so you can
add a path or a sentence before sending. `submit` sends it as a turn of its own,
with nothing to confirm — keep that for prompts you always want sent whole.

The band hides itself while Claude is working and while a survey is up, so it
never sits on top of something else.

## Install

At the prompt of a terminal session:

```
/plugin install quick-keys --marketplace ktang85/quick-keys
```

From a shell:

```
claude plugin install quick-keys --marketplace ktang85/quick-keys
```

Answer `y` to add the marketplace, then pick a scope (user scope installs it for
every project). In the desktop app, where `/plugin` does not run: click + next
to the prompt box, then Plugins, Add marketplace with `ktang85/quick-keys`, then Add
plugin.

## Editing the shortcuts

Run `/keys`. Each row has the digit, the label, a `fill`/`submit` button that
flips the kind, the text, and `remove`. The `add` input takes one line:

```
<digit> <fill|submit> <label> <text>
```

So `5 fill tests /react-test` binds `5` to a button labelled `tests` that types
`/react-test` into the prompt box. A digit already in use is replaced, not
doubled up, and a line that does not parse is refused with a toast rather than
saved. `reset` puts the four defaults back.

Entries live in the plugin's own store, keyed per machine, not in a file you
edit by hand.

## Developing it

```
claude --plugin-dir /path/to/quick-keys      # run a session with the mod loaded
claude plugin validate /path/to/quick-keys   # manifest, state contract, hooks
claude plugin test /path/to/quick-keys       # the 8 tests in tests/
```

`claude plugin test` has to run outside a live Claude Code session — a session's
own environment makes it refuse.

The engine writes `.claude-plugin/types/` the first time it loads the mod: the
API declarations, and the `tsconfig.json` that the top-level one extends. That
folder is generated and gitignored, so `tsc -p .` only works after one load.

- `hooks/register.tsx` — the whole mod: `session.start`, `command.run`, and two
  `ui.render` hooks (the band, the pane).
- `types/index.d.ts` — the `$.state` contract, which `claude plugin validate`
  holds the module to.
- `tests/band.test.tsx` — mounts the band and the pane and drives them.

## License

MIT. See [LICENSE](LICENSE).
