import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { QuickKey } from '../types'

const PANE = 'quick-keys'
const STORE = 'commands'

/** What a fresh install starts with, and what `reset` in the pane puts back. */
const DEFAULTS: readonly QuickKey[] = [
  { hotkey: '1', label: 'review', kind: 'fill', text: '/code-review ' },
  { hotkey: '2', label: 'simplify', kind: 'fill', text: '/simplify ' },
  { hotkey: '3', label: 'security', kind: 'fill', text: '/security-review ' },
  {
    hotkey: '4',
    label: 'recap',
    kind: 'submit',
    text: 'Recap what you changed so far in this session, file by file.',
  },
]

const FORMAT = 'Format: <digit> <fill|submit> <label> <text>'

/** null until the store has been read; the band draws nothing before then. */
const commands = atom({ plugin: 'quick-keys', key: 'commands' } as const, null)

/** What the store holds is the person's to edit, so read it defensively. */
const sane = (value: unknown): QuickKey[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  const list: QuickKey[] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) {
      return undefined
    }

    const { hotkey, label, kind, text } = row as Record<string, unknown>
    if (typeof hotkey !== 'string' || typeof label !== 'string') {
      return undefined
    }
    if (typeof text !== 'string' || (kind !== 'fill' && kind !== 'submit')) {
      return undefined
    }

    list.push({ hotkey, label, kind, text })
  }

  return list
}

const byHotkey = (a: QuickKey, b: QuickKey) => a.hotkey.localeCompare(b.hotkey)

const save = async ($: EngineInterface, list: readonly QuickKey[]) => {
  const sorted = [...list].sort(byHotkey)
  await update($, commands, () => sorted)
  await $.store.set(STORE, sorted)
}

const fromStore = async ($: EngineInterface): Promise<QuickKey[]> =>
  sane(await $.store.get(STORE)) ?? [...DEFAULTS]

/**
 * What to draw. Pure: a render hook may not write state, so a mount that
 * missed `session.start` falls back to the store rather than hydrating.
 */
const shown = async ($: EngineInterface): Promise<QuickKey[]> =>
  (await read($, commands)) ?? (await fromStore($))

/** One line of the pane's input into an entry, or the reason it is not one. */
const parse = (line: string): QuickKey | string => {
  const match = line.trim().match(/^([0-9])\s+(fill|submit)\s+(\S+)\s+([\s\S]+)$/)
  if (match === null) {
    return FORMAT
  }

  const [, hotkey, kind, label, text] = match
  if (hotkey === undefined || label === undefined || text === undefined) {
    return FORMAT
  }

  return { hotkey, label, kind: kind === 'submit' ? 'submit' : 'fill', text }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'keys',
      description: 'Edit the number-key shortcuts drawn above the prompt',
    })
    const list = await fromStore($)
    await update($, commands, () => list)

    return next(e)
  })

  on('command.run', { command: 'keys' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Quick keys', focus: true })

    return { text: 'Quick keys pane opened.' }
  })

  // The band: one button per entry, pressed by its digit from an empty prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await shown($)
    if (e.props.hasSurvey || e.props.isWorking || list.length === 0) {
      return next(e)
    }

    const { Box, Button } = $.ui.resolve(e)

    return (
      <Box gap={1}>
        {list.map(one => (
          <Button
            key={one.hotkey}
            hotkey={one.hotkey}
            label={one.label}
            plain
            dimColor
            onPress={() => {
              if (one.kind === 'submit') {
                void $.prompt.submit({ text: one.text, asUser: true })
              } else {
                void $.prompt.fill({ text: one.text, mode: 'replace' })
              }
            }}
          />
        ))}
      </Box>
    )
  })

  // The editor: a row per entry, an input to add one, and a reset.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Input, Text } = $.ui.resolve(e)
    const list = await shown($)

    return (
      <Box flexDirection="column">
        {list.length === 0 && <Text dimColor>No shortcuts yet.</Text>}
        {list.map(one => (
          <Box key={`row:${one.hotkey}`} gap={1}>
            <Text>{one.hotkey}</Text>
            <Text>{one.label}</Text>
            <Button
              key={`kind:${one.hotkey}`}
              label={one.kind}
              plain
              onPress={async () => {
                const kind = one.kind === 'fill' ? 'submit' : 'fill'
                await save(
                  $,
                  list.map(row =>
                    row.hotkey === one.hotkey ? { ...row, kind } : row,
                  ),
                )
              }}
            />
            <Text dimColor>{one.text.trim()}</Text>
            <Button
              key={`remove:${one.hotkey}`}
              label="remove"
              plain
              dimColor
              onPress={async () => {
                await save(
                  $,
                  list.filter(row => row.hotkey !== one.hotkey),
                )
              }}
            />
          </Box>
        ))}
        <Input
          key="add"
          label="add"
          placeholder="5 fill tests /react-test"
          submitLabel="add"
          autoFocus
          onSubmit={value => {
            const parsed = parse(value)
            if (typeof parsed === 'string') {
              $.ui.toast(parsed)

              return
            }

            // A digit already in use is replaced, not doubled up.
            const rest = list.filter(row => row.hotkey !== parsed.hotkey)
            void save($, [...rest, parsed])
          }}
        />
        <Box gap={1}>
          <Text dimColor>{FORMAT}</Text>
          <Button
            key="reset"
            label="reset"
            plain
            dimColor
            onPress={async () => {
              await save($, DEFAULTS)
            }}
          />
        </Box>
      </Box>
    )
  })
}
