/**
 * Mistral API Provider
 * Uses Mistral's API endpoint
 */

const https = require('https');

class MistralProvider {
  constructor(apiKey, model = 'mistral-tiny') {
    this.key = apiKey;
    this.model = model;
    this.baseUrl = 'api.mistral.ai';
    this.path = '/v1/chat/completions';
  }

  setModel(model) {
    this.model = model;
  }

  getAvailableModels() {
    return [
      'mistral-tiny',
      'mistral-small',
      'mistral-medium',
      'mistral-large-latest',
      'codestral-latest',
      'mistral-embed'
    ];
  }

  async chat(messages) {
    return this._request({ model: this.model, messages, stream: false });
  }

  async streamChat(messages, onChunk) {
    const response = await this._requestRaw({ 
      model: this.model, 
      messages, 
      stream: true 
    });

    return new Promise((resolve, reject) => {
      let fullContent = '';
      let buffer = '';

      response.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (e) {
              // Skip malformed chunks
            }
          }
        }
      });

      response.on('end', () => resolve(fullContent));
      response.on('error', reject);
    });
  }

  async _request(body) {
    const response = await this._requestRaw(body);
    
    return new Promise((resolve, reject) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`Mistral API: ${parsed.error.message}`));
          } else {
            resolve(parsed.choices[0].message);
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${data.slice(0, 200)}`));
        }
      });
      response.on('error', reject);
    });
  }

  _requestRaw(body) {
    return new Promise((resolve, reject) => {
      if (!this.key) {
        reject(new Error('Mistral API key not configured. Add it to ~/.tensora.json'));
        return;
      }

      const postData = JSON.stringify(body);
      
      const options = {
        hostname: this.baseUrl,
        path: this.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.key}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, resolve);
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

module.exports = MistralProvider;
