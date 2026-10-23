export type QuickKey = {
  hotkey: string
  label: string
  kind: 'fill' | 'submit'
  text: string
}

declare module 'claude-code' {
  interface PluginState {
    'quick-keys': { commands: QuickKey[] | null }
  }
}
