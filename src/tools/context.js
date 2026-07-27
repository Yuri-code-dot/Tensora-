/**
 * ContextTools - Project context awareness for Tensora
 */

const fs = require('fs').promises;
const path = require('path');

class ContextTools {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.cache = null;
    this.cacheTime = 0;
  }

  async getContext() {
    const now = Date.now();
    // Cache for 5 seconds
    if (this.cache && now - this.cacheTime < 5000) {
      return this.cache;
    }

    const [fileTree, gitBranch, packageJson] = await Promise.all([
      this.getFileTree(),
      this.getGitBranch(),
      this.getPackageJson()
    ]);

    this.cache = {
      projectName: packageJson?.name || path.basename(this.baseDir),
      fileTree,
      gitBranch,
      language: this.detectLanguage(fileTree)
    };
    this.cacheTime = now;

    return this.cache;
  }

  async getFileTree(maxDepth = 2) {
    const tree = [];
    
    try {
      await this._walkDir(this.baseDir, '', 0, maxDepth, tree);
    } catch (err) {
      // Silently handle permission errors
    }
    
    return tree;
  }

  async _walkDir(dir, prefix, depth, maxDepth, tree) {
    if (depth > maxDepth) return;
    
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    // Skip common non-code directories
    const skipDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.venv', '__pycache__', '.pytest_cache'];
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
      if (skipDirs.includes(entry.name)) {
        tree.push(`${prefix}${entry.name}/`);
        continue;
      }
      
      const relativePath = path.join(prefix, entry.name);
      
      if (entry.isDirectory()) {
        tree.push(`${relativePath}/`);
        if (depth < maxDepth) {
          await this._walkDir(path.join(dir, entry.name), relativePath, depth + 1, maxDepth, tree);
        }
      } else {
        tree.push(relativePath);
      }
    }
  }

  async getGitBranch() {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.baseDir });
      return stdout.trim();
    } catch {
      return null;
    }
  }

  async getPackageJson() {
    try {
      const content = await fs.readFile(path.join(this.baseDir, 'package.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  detectLanguage(fileTree) {
    const extensions = {};
    for (const f of fileTree) {
      const ext = path.extname(f);
      if (ext) extensions[ext] = (extensions[ext] || 0) + 1;
    }
    
    const max = Object.entries(extensions).sort((a, b) => b[1] - a[1])[0];
    if (!max) return 'unknown';
    
    const langMap = {
      '.js': 'JavaScript', '.ts': 'TypeScript', '.jsx': 'React', '.tsx': 'React TS',
      '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.rb': 'Ruby',
      '.java': 'Java', '.cpp': 'C++', '.c': 'C', '.h': 'C/C++',
      '.php': 'PHP', '.swift': 'Swift', '.kt': 'Kotlin'
    };
    
    return langMap[max[0]] || max[0];
  }
}

module.exports = ContextTools;
