import { cpSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const to = join(root, 'public', 'mediapipe', 'wasm')

mkdirSync(to, { recursive: true })
for (const name of readdirSync(from)) {
  if (name.includes('module')) continue
  cpSync(join(from, name), join(to, name))
}
