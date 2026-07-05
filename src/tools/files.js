/**
 * FileTools - File operations for Tensora
 */

const fs = require('fs').promises;
const path = require('path');

class FileTools {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  _resolvePath(filePath) {
    if (path.isAbsolute(filePath)) return filePath;
    return path.join(this.baseDir, filePath);
  }

  async read(filePath) {
    const fullPath = this._resolvePath(filePath);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.size > 1024 * 1024) {
        throw new Error(`File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
      }
      return await fs.readFile(fullPath, 'utf-8');
    } catch (err) {
      if (err.code === 'ENOENT') throw new Error(`File not found: ${filePath}`);
      throw err;
    }
  }

  async write(filePath, content) {
    const fullPath = this._resolvePath(filePath);
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async list(dirPath = '.') {
    const fullPath = this._resolvePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    // Sort: dirs first, then files, alphabetically
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    return Promise.all(entries.map(async (entry) => {
      const isDir = entry.isDirectory();
      let size = '';
      if (!isDir) {
        try {
          const stat = await fs.stat(path.join(fullPath, entry.name));
          size = this._formatSize(stat.size);
        } catch {}
      }
      return { name: entry.name, isDir, size };
    }));
  }

  async exists(filePath) {
    try {
      await fs.access(this._resolvePath(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async edit(filePath, search, replace) {
    const content = await this.read(filePath);
    if (!content.includes(search)) {
      throw new Error(`Search pattern not found in file: ${search.slice(0, 50)}...`);
    }
    const newContent = content.replace(search, replace);
    await this.write(filePath, newContent);
    return newContent;
  }

  _formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }
}

module.exports = FileTools;
