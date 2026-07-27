/**
 * ShellTools - Command execution for Tensora
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ShellTools {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  async exec(command, options = {}) {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd || this.baseDir,
      timeout: options.timeout || 30000,
      maxBuffer: options.maxBuffer || 1024 * 1024,
      env: { ...process.env, ...options.env }
    });
    return stdout || stderr;
  }

  // Run a command and stream output in real-time
  async execStream(command, onData, options = {}) {
    return new Promise((resolve, reject) => {
      const child = require('child_process').exec(command, {
        cwd: options.cwd || this.baseDir,
        timeout: options.timeout || 30000,
        env: { ...process.env, ...options.env }
      });

      let output = '';

      child.stdout?.on('data', (data) => {
        output += data;
        onData?.(data);
      });

      child.stderr?.on('data', (data) => {
        output += data;
        onData?.(data);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command exited with code ${code}: ${output}`));
        } else {
          resolve(output);
        }
      });

      child.on('error', reject);
    });
  }
}

module.exports = ShellTools;
