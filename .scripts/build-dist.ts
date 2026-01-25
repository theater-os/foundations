import { $ } from 'bun'
import chalk from 'chalk'
import packages from '../package.json'

console.log(chalk.grey.bold('⚡️ Building dist...'))

for await (const pkg of packages.workspaces.packages) {
  console.log(chalk.grey.bold(`🔍 Building ${pkg}...`))
  await $`cd ${pkg} && bun i && bun build:dist`.catch(() => {
    console.log(chalk.yellow.bold(`🤔 ${pkg} dist build failed, skipping...`))
  })
}

console.log(chalk.green.bold('✅ Dist built'))
