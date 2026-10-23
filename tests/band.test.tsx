import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'quick-keys',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
  },
} as const

const PANE = {
  plugin: 'quick-keys',
  component: 'Pane',
  requestId: 'quick-keys',
  props: {
    title: 'Quick keys',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

test('the band draws a button per default command', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })

  for (const key of ['1', '2', '3', '4']) {
    const button = await ui.find({ type: 'Button', key })
    expect(button?.props.hotkey).toBe(key)
  }
  await ui.unmount()
})

test('a fill entry puts the slash command in the prompt box', async ($, on) => {
  mock.store(on)
  let filled: string | undefined
  on('prompt.fill', (_, e) => {
    filled = e.text

    return { isFilled: true }
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ type: 'Button', key: '1' })
  expect(filled).toBe('/code-review ')
  await ui.unmount()
})

test('a submit entry sends a turn of its own', async ($, on) => {
  mock.store(on)
  let sent: string | undefined
  on('prompt.submit', (_, e) => {
    sent = e.text

    return { text: e.text }
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ type: 'Button', key: '4' })
  expect(sent).toMatch(/Recap what you changed/)
  await ui.unmount()
})

test('the band yields to a survey', async ($, on) => {
  mock.store(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({
    ...BAND,
    props: { ...BAND.props, hasSurvey: true },
    surface: 'terminal',
  })

  expect(await ui.find({ type: 'Button', key: '1' })).toBe(undefined)
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('the band draws what the store already held', async ($, on) => {
  mock.store(on, {
    commands: [{ hotkey: '7', label: 'mine', kind: 'fill', text: '/mine ' }],
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Button', key: '7' }))?.props.label).toBe('mine')
  expect(await ui.find({ type: 'Button', key: '1' })).toBe(undefined)
  await ui.unmount()
})

test('a line typed into the pane becomes a band button', async ($, on) => {
  mock.store(on)
  const pane = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await pane.input({ key: 'add', text: '5 fill tests /react-test' })

  expect((await pane.find({ type: 'Button', key: 'kind:5' }))?.props.label).toBe(
    'fill',
  )
  await pane.unmount()

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await band.find({ type: 'Button', key: '5' }))?.props.label).toBe(
    'tests',
  )
  await band.unmount()
})

test('the pane flips a kind, removes a row, and resets', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  await ui.press({ type: 'Button', key: 'kind:1' })
  expect((await ui.find({ type: 'Button', key: 'kind:1' }))?.props.label).toBe(
    'submit',
  )

  await ui.press({ type: 'Button', key: 'remove:2' })
  expect(await ui.find({ type: 'Button', key: 'remove:2' })).toBe(undefined)

  await ui.press({ type: 'Button', key: 'reset' })
  expect((await ui.find({ type: 'Button', key: 'kind:1' }))?.props.label).toBe(
    'fill',
  )
  expect(await ui.find({ type: 'Button', key: 'remove:2' })).not.toBe(undefined)
  await ui.unmount()
})

test('a badly typed line is refused with a toast', async ($, on) => {
  mock.store(on)
  let toasted: string | undefined
  // A call on `$`, so the stand-in answers `{ value }`.
  on('ui.toast', (_, e) => {
    toasted = e.text

    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'add', text: 'nonsense' })
  expect(toasted).toMatch(/Format/)
  expect(await ui.find({ type: 'Button', key: 'remove:1' })).not.toBe(undefined)
  await ui.unmount()
})
