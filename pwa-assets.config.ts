// Generates the app icons from public/icon.svg: run `npx pwa-assets-generator`.
// Every size is black to the edges, with no white or transparent margin.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const fullBleed = { padding: 0, resizeOptions: { background: '#111111' } }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, ...fullBleed },
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ['public/icon.svg'],
})
