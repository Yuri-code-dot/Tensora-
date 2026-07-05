#!/usr/bin/env node

/**
 * Tensora - Terminal AI Coding Assistant
 * A Claude Code clone with multi-API support
 * 
 * Usage: tensora [options] [prompt]
 *        ten [options] [prompt]
 */

const { program } = require('commander');
const chalk = require('chalk');
const boxen = require('boxen');
const path = require('path');

const TensoraCLI = require('./cli');
const { loadConfig, ensureConfig } = require('./config');

program
  .name('tensora')
  .description('Tensora - AI coding assistant with Groq & Mistral support')
  .version('1.0.0')
  .option('-v, --verbose', 'verbose output')
  .option('-d, --dir <directory>', 'working directory', process.cwd())
  .option('--no-stream', 'disable streaming responses')
  .argument('[prompt...]', 'initial prompt to send')
  .action(async (promptArgs, options) => {
    // Header
    console.log(boxen(
      chalk.hex('#e94560').bold('Tensora') + ' ' + chalk.gray('v1.0.0') + '\n' +
      chalk.dim('AI Coding Assistant — Groq & Mistral'),
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'round',
        borderColor: '#e94560'
      }
    ));

    // Ensure config exists
    await ensureConfig();
    
    const config = loadConfig();
    const workingDir = path.resolve(options.dir);
    
    // Create CLI instance
    const cli = new TensoraCLI({
      config,
      workingDir,
      verbose: options.verbose,
      streamResponses: options.stream
    });

    // Handle initial prompt if provided
    const initialPrompt = promptArgs.join(' ');
    
    try {
      await cli.start(initialPrompt);
    } catch (err) {
      console.error(chalk.red('Fatal error:'), err.message);
      if (options.verbose) console.error(err.stack);
      process.exit(1);
    }
  });

program.parse();
