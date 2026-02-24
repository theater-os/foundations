import { defineConfig } from 'tsup'
import { baseConfig } from '../../tsup.base'

export default defineConfig({
  entry: ['src/flow.ts'],
  ...baseConfig,
})
