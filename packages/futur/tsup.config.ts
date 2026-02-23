import { defineConfig } from 'tsup'
import { baseConfig } from '../../tsup.base'

export default defineConfig({
  entry: ['src/futur.ts'],
  ...baseConfig,
})
