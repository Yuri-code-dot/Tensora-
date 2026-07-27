/**
 * TensoraCLI - Main interactive terminal interface
 */

const readline = require('readline');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');

const APIRouter = require('./api/router');
const FileTools = require('./tools/files');
const ShellTools = require('./tools/shell');
const ContextTools = require('./tools/context');
const { saveConfig } = require('./config');

class TensoraCLI {
  constructor(options) {
    this.config = options.config;
    this.workingDir = options.workingDir;
    this.verbose = options.verbose || false;
    this.streamResponses = options.streamResponses !== false;
    
    this.api = new APIRouter(this.config);
    this.files = new FileTools(this.workingDir);
    this.shell = new ShellTools(this.workingDir);
    this.context = new ContextTools(this.workingDir);
    
    this.conversationHistory = [];
    this.running = false;
    this.rl = null;
    
    this.commands = {
      '/help': this.showHelp.bind(this),
      '/switch': this.switchProvider.bind(this),
      '/model': this.switchModel.bind(this),
      '/reset': this.resetConversation.bind(this),
      '/clear': this.clearScreen.bind(this),
      '/ls': this.listFiles.bind(this),
      '/cat': this.readFile.bind(this),
      '/pwd': this.showDir.bind(this),
      '/git': this.gitStatus.bind(this),
      '/config': this.showConfig.bind(this),
      '/quit': this.quit.bind(this),
      '/exit': this.quit.bind(this),
    };
  }

  async start(initialPrompt) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt()
    });

    this.running = true;
    
    // Show current provider
    const provider = this.api.getCurrentProvider();
    console.log(chalk.dim(`Using: ${chalk.hex('#e94560')(provider.name)} — ${provider.model}`));
    console.log(chalk.dim(`Working: ${this.workingDir}`));
    console.log(chalk.dim(`Type /help for commands\n`));

    // Handle initial prompt
    if (initialPrompt) {
      await this.handleInput(initialPrompt);
    }

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      if (!this.running) return;
      await this.handleInput(input.trim());
      if (this.running) this.rl.prompt();
    });

    this.rl.on('close', () => this.quit());
  }

  getPrompt() {
    const provider = this.api.getCurrentProvider();
    return chalk.hex('#e94560')('tensora') + 
           chalk.gray(`[${provider.name}]`) + 
           chalk.gray(' > ');
  }

  async handleInput(input) {
    if (!input) return;
    
    // Check for built-in commands
    const cmd = input.split(' ')[0];
    if (this.commands[cmd]) {
      const args = input.slice(cmd.length).trim();
      await this.commands[cmd](args);
      return;
    }

    // Handle natural language queries
    await this.handleQuery(input);
  }

  async handleQuery(input) {
    const spinner = ora({ 
      text: chalk.dim('Thinking...'), 
      spinner: 'dots',
      color: 'red'
    }).start();

    try {
      // Gather context
      const context = await this.context.getContext();
      
      // Build messages
      const messages = this.buildMessages(input, context);
      
      spinner.stop();

      // Stream or fetch response
      if (this.streamResponses) {
        const response = await this.api.streamChat(messages, (chunk) => {
          process.stdout.write(chalk.white(chunk));
        });
        process.stdout.write('\n\n');
        
        this.conversationHistory.push({ role: 'user', content: input });
        this.conversationHistory.push({ role: 'assistant', content: response });
      } else {
        const response = await this.api.chat(messages);
        spinner.stop();
        console.log(chalk.white(response.content) + '\n');
        
        this.conversationHistory.push({ role: 'user', content: input });
        this.conversationHistory.push({ role: 'assistant', content: response.content });
      }

      // Trim history to keep token usage sane
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }
    } catch (err) {
      spinner.stop();
      console.log(chalk.red('Error:'), err.message);
      if (this.verbose) console.error(err);
    }
  }

  buildMessages(input, context) {
    const systemPrompt = `You are Tensora, an AI coding assistant. You help with programming tasks, file operations, and shell commands.

Current project: ${context.projectName}
Working directory: ${this.workingDir}
${context.gitBranch ? `Git branch: ${context.gitBranch}` : ''}
Files in directory: ${context.fileTree.slice(0, 20).join(', ')}

When suggesting file edits, use this format:
~~~FILE:path/to/file~~~
// content here
~~~END~~~

Available tools you can suggest:
- Read file: ask user to run /cat <file>
- List files: /ls [path]
- Git status: /git
- Shell command: suggest command for user to run

Be concise and helpful. Focus on code quality and best practices.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: input }
    ];
    
    return messages;
  }

  // ---- Commands ----

  showHelp() {
    console.log(chalk.hex('#e94560').bold('\nTensora Commands\n'));
    const cmds = [
      ['/help', 'Show this help message'],
      ['/switch', 'Switch API provider (groq/mistral)'],
      ['/model <name>', 'Change the AI model'],
      ['/reset', 'Clear conversation history'],
      ['/clear', 'Clear screen'],
      ['/ls [path]', 'List files in directory'],
      ['/cat <file>', 'Read file contents'],
      ['/pwd', 'Show current directory'],
      ['/git', 'Show git status'],
      ['/config', 'Show current configuration'],
      ['/quit, /exit', 'Quit Tensora'],
    ];
    cmds.forEach(([cmd, desc]) => {
      console.log(`  ${chalk.hex('#e94560')(cmd).padEnd(18)} ${chalk.gray(desc)}`);
    });
    console.log();
  }

  async switchProvider(args) {
    const providers = ['groq', 'mistral'];
    if (!args) {
      console.log(chalk.gray('Available:'), providers.map(p => chalk.hex('#e94560')(p)).join(', '));
      return;
    }
    
    const name = args.toLowerCase().trim();
    if (!providers.includes(name)) {
      console.log(chalk.red(`Unknown provider: ${name}`));
      return;
    }
    
    this.api.switchProvider(name);
    this.config.defaultProvider = name;
    saveConfig(this.config);
    
    const provider = this.api.getCurrentProvider();
    console.log(chalk.green(`Switched to ${chalk.bold(provider.name)} — ${provider.model}`));
    
    // Update prompt
    this.rl.setPrompt(this.getPrompt());
  }

  async switchModel(args) {
    if (!args) {
      const models = this.api.getAvailableModels();
      console.log(chalk.gray('Available models:'));
      models.forEach(m => console.log(`  ${chalk.hex('#e94560')(m)}`));
      return;
    }
    
    this.api.setModel(args.trim());
    this.config[this.config.defaultProvider === 'groq' ? 'groqModel' : 'mistralModel'] = args.trim();
    saveConfig(this.config);
    
    const provider = this.api.getCurrentProvider();
    console.log(chalk.green(`Model set to ${chalk.bold(provider.model)}`));
  }

  resetConversation() {
    this.conversationHistory = [];
    console.log(chalk.gray('Conversation history cleared.'));
  }

  clearScreen() {
    console.clear();
  }

  async listFiles(args) {
    const dir = args ? path.resolve(this.workingDir, args) : this.workingDir;
    try {
      const files = await this.files.list(dir);
      console.log(chalk.gray(`\n${dir}`));
      files.forEach(f => {
        const icon = f.isDir ? '📁' : '📄';
        const color = f.isDir ? chalk.blue : chalk.white;
        console.log(`  ${icon} ${color(f.name)}${chalk.gray(f.isDir ? '/' : ` (${f.size})`)}`);
      });
      console.log();
    } catch (err) {
      console.log(chalk.red(`Error: ${err.message}`));
    }
  }

  async readFile(args) {
    if (!args) {
      console.log(chalk.red('Usage: /cat <file>'));
      return;
    }
    
    try {
      const content = await this.files.read(args);
      const lines = content.split('\n');
      const padding = lines.length.toString().length;
      
      console.log();
      lines.forEach((line, i) => {
        const num = chalk.gray((i + 1).toString().padStart(padding));
        console.log(`${num} ${chalk.white(line)}`);
      });
      console.log();
    } catch (err) {
      console.log(chalk.red(`Error: ${err.message}`));
    }
  }

  showDir() {
    console.log(chalk.hex('#e94560')(this.workingDir));
  }

  async gitStatus() {
    try {
      const status = await this.shell.exec('git status --short');
      const branch = await this.shell.exec('git branch --show-current');
      
      console.log(chalk.gray('\nGit:') + ' ' + chalk.hex('#e94560')(branch.trim()));
      if (status.trim()) {
        console.log(chalk.gray('Changes:'));
        status.split('\n').forEach(line => {
          if (line.startsWith('M')) console.log(`  ${chalk.yellow(line)}`);
          else if (line.startsWith('??')) console.log(`  ${chalk.green(line)}`);
          else console.log(`  ${line}`);
        });
      } else {
        console.log(chalk.gray('Working tree clean'));
      }
      console.log();
    } catch {
      console.log(chalk.red('Not a git repository'));
    }
  }

  showConfig() {
    const provider = this.api.getCurrentProvider();
    console.log(chalk.hex('#e94560').bold('\nTensora Config\n'));
    console.log(`  Provider:  ${chalk.white(provider.name)}`);
    console.log(`  Model:     ${chalk.white(provider.model)}`);
    console.log(`  Directory: ${chalk.white(this.workingDir)}`);
    console.log(`  Streaming: ${chalk.white(this.streamResponses ? 'on' : 'off')}`);
    console.log();
  }

  quit() {
    this.running = false;
    console.log(chalk.gray('\nGoodbye 👋\n'));
    this.rl?.close();
    process.exit(0);
  }
}

module.exports = TensoraCLI;
