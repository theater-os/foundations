import { $ } from 'bun'
import chalk from 'chalk'

console.log(chalk.grey.bold('🧹 Cleaning dist...'))

await $`rm -rf packages/*/dist`.catch(() => {
  console.log(chalk.yellow.bold('🤔 No dist to clean, skipping...'))
})

console.log(chalk.green.bold('👌🏽 Dist cleaned'))
