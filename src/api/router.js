/**
 * APIRouter - Manages switching between AI providers
 */

const GroqProvider = require('./groq');
const MistralProvider = require('./mistral');

class APIRouter {
  constructor(config) {
    this.config = config;
    this.providers = {
      groq: new GroqProvider(config.groqKey, config.groqModel),
      mistral: new MistralProvider(config.mistralKey, config.mistralModel)
    };
    this.current = config.defaultProvider || 'groq';
  }

  switchProvider(name) {
    if (!this.providers[name]) {
      throw new Error(`Unknown provider: ${name}. Available: groq, mistral`);
    }
    this.current = name;
  }

  setModel(model) {
    this.providers[this.current].setModel(model);
  }

  getCurrentProvider() {
    const p = this.providers[this.current];
    return {
      name: this.current,
      model: p.model,
      key: p.key ? '✓ set' : '✗ missing'
    };
  }

  getAvailableModels() {
    return this.providers[this.current].getAvailableModels();
  }

  async chat(messages) {
    return this.providers[this.current].chat(messages);
  }

  async streamChat(messages, onChunk) {
    return this.providers[this.current].streamChat(messages, onChunk);
  }
}

module.exports = APIRouter;
