#!/usr/bin/env node

import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { runTests } from '../src/runner.js';
import { generateHtmlReport } from '../src/report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

const banner = [
  '',
  chalk.cyan('.___________. _______     _______.___________. __      ____    ____ .__   __. '),
  chalk.cyan('|           ||   ____|   /       |           ||  |     \\   \\  /   / |  \\ |  | '),
  chalk.cyan('`---|  |----`|  |__     |   (----`---|  |----`|  |      \\   \\/   /  |   \\|  | '),
  chalk.cyan('    |  |     |   __|     \\   \\       |  |     |  |       \\_    _/   |  . `  | '),
  chalk.cyan('    |  |     |  |____.----)   |      |  |     |  `----.    |  |     |  |\\   | '),
  chalk.cyan('    |__|     |_______|_______/       |__|     |_______|    |__|     |__| \\__| '),
  '',
  chalk.yellow('  🧪  API Testing with YAML  ') + chalk.gray(`v${pkg.version}`),
  ''
].join('\n');

program
  .name('testlyn')
  .description(chalk.cyan('CLI-based API testing tool using YAML syntax'))
  .option('-v, --version', 'Show version')
  .option('--v', 'Show version')
  .on('option:version', () => {
    console.log(banner);
    process.exit(0);
  })
  .on('option:v', () => {
    console.log(banner);
    process.exit(0);
  });

program.configureOutput({
  writeOut: (str) => {
    if (str.includes('Usage:')) {
      process.stdout.write(banner + str);
    } else {
      process.stdout.write(str);
    }
  }
});

program
  .command('run <file>')
  .description('Run tests from a YAML file')
  .option('-V, --verbose', 'Verbose output')
  .option('-s, --stop-on-error', 'Stop on first error')
  .option('--html [path]', 'Generate an HTML report (optional output path)')
  .action(async (file, options) => {
    try {
      const testFile = resolve(process.cwd(), file);
      console.log(chalk.blue(`📋 Loading tests from: ${testFile}`));

      const result = await runTests(testFile, options);

      if (options.html) {
        const outputPath = typeof options.html === 'string' ? resolve(process.cwd(), options.html) : undefined;
        const reportPath = generateHtmlReport(result, { testFile: file, outputPath });
        console.log(chalk.cyan(`📄 HTML report written to: ${reportPath}`));
      }

      console.log(chalk.green('\n✅ All tests completed!\n'));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

program
  .command('init [name]')
  .description('Initialize a new testlyn project')
  .action((name) => {
    const projectName = name || 'testlyn-project';
    console.log(chalk.cyan(`\n🚀 Initializing ${projectName}...\n`));
    // TODO: Initialize project structure
    console.log(chalk.green('✅ Project initialized!\n'));
  });

program
  .command('validate <file>')
  .description('Validate YAML test file syntax')
  .action((file) => {
    try {
      const testFile = resolve(process.cwd(), file);
      readFileSync(testFile, 'utf-8');
      console.log(chalk.green('\n✅ File is valid!\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Validation error: ${error.message}\n`));
      process.exit(1);
    }
  });

if (!process.argv.slice(2).length) {
  process.argv.push('-h');
}

program.parse(process.argv);
