/**
 * Config management for Tensora
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATH = path.join(os.homedir(), '.tensora.json');

const DEFAULT_CONFIG = {
  defaultProvider: 'groq',
  groqKey: '',
  groqModel: 'llama3-8b-8192',
  mistralKey: '',
  mistralModel: 'mistral-tiny'
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Warning: Could not read config, using defaults');
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
  try {
    const toSave = {
      defaultProvider: config.defaultProvider,
      groqKey: config.groqKey,
      groqModel: config.groqModel,
      mistralKey: config.mistralKey,
      mistralModel: config.mistralModel
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2));
  } catch (err) {
    console.error('Warning: Could not save config');
  }
}

async function ensureConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const chalk = require('chalk');
    console.log(chalk.yellow('First time setup! Creating config at ~/.tensora.json\n'));
    console.log(chalk.gray('Add your API keys:'));
    console.log(chalk.hex('#e94560')('  Groq:    ') + chalk.gray('https://console.groq.com/keys'));
    console.log(chalk.hex('#e94560')('  Mistral: ') + chalk.gray('https://console.mistral.ai/api-keys\n'));
    
    saveConfig(DEFAULT_CONFIG);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  ensureConfig,
  CONFIG_PATH
};
