import { $ } from 'bun'
import chalk from 'chalk'
import packages from '../package.json'

console.log(chalk.grey.bold('⚡️ Building dist...'))

for await (const pkg of packages.workspaces.packages) {
  await $`cd ${pkg} && bun build:dist`
}

console.log(chalk.green.bold('✅ Dist built'))
