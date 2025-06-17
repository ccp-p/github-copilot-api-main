class CopilotChat {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api';
    this.isAuthenticated = false;
    this.models = [];
    this.currentToken = null;
    
    this.init();
  }

  async init() {
    // 页面加载时自动尝试恢复会话
    await this.tryRestoreSession();
      this.restoreSystemMessage(); // 恢复系统消息
          this.createSystemMessagePresets(); // 创建预设按钮

    this.setupEventListeners();
  }
    // 新增：清除所有缓存数据
  clearAllCache() {
    localStorage.removeItem('github_token');
    localStorage.removeItem('system_message');
    this.isAuthenticated = false;
    this.currentToken = null;
    this.defaultSystemMessage = '';
    
    // 重置界面
    const systemMessageElement = document.getElementById('system-message');
    if (systemMessageElement) {
      systemMessageElement.value = '';
    }
    
    this.updateUI();
  }
    // 在 createQuickAuthButton 方法中添加清除缓存按钮
  createQuickAuthButton() {
    const authCard = document.querySelector('.card:first-child .card-body');
    const quickAuthDiv = document.createElement('div');
    quickAuthDiv.className = 'mt-3 pt-3 border-top';
    quickAuthDiv.innerHTML = `
      <p class="text-muted mb-2">Quick access (if you have a token):</p>
      <div class="input-group mb-2">
        <input type="password" class="form-control" id="quick-token" placeholder="Paste token here">
        <button class="btn btn-outline-primary" type="button" id="quick-auth">Go</button>
      </div>
      <button class="btn btn-outline-danger btn-sm" type="button" id="clear-cache">Clear All Cache</button>
    `;
    authCard.appendChild(quickAuthDiv);

    // 快速认证事件
    document.getElementById('quick-auth').addEventListener('click', async () => {
      const token = document.getElementById('quick-token').value;
      if (token) {
        try {
          await this.authenticateWithToken(token);
          document.getElementById('quick-token').value = '';
        } catch (error) {
          alert('Quick auth failed: ' + error.message);
        }
      }
    });

    // 清除缓存事件
    document.getElementById('clear-cache').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all cached data?')) {
        this.clearAllCache();
        alert('Cache cleared successfully!');
      }
    });
  }

  // 尝试恢复之前保存的会话
  async tryRestoreSession() {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      try {
        await this.authenticateWithToken(savedToken, false);
      } catch (error) {
        console.log('Saved token expired, please re-authenticate');
        localStorage.removeItem('github_token');
      }
    }
  }

  // 简化的认证流程
  async authenticateWithToken(token, saveToken = true) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (!response.ok) throw new Error('Authentication failed');
      
      const result = await response.json();
      this.currentToken = result.token;
      this.isAuthenticated = true;
      
      if (saveToken) {
        localStorage.setItem('github_token', token);
      }
      
      // 自动获取模型列表
      await this.fetchModels();
      this.updateUI();
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // 自动获取模型
  async fetchModels() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.currentToken}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      this.models = data.data || [];
      this.populateModelSelect();
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  }

  populateModelSelect() {
    const modelSelect = document.getElementById('model-select');
    modelSelect.innerHTML = '<option value="">Select a model</option>';
    
    this.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.id;
      modelSelect.appendChild(option);
    });
    
    // 自动选择第一个可用模型
    if (this.models.length > 0) {
      // id claude-sonnet-4
      const isClaudeModel = this.models.some(model => model.id === 'claude-sonnet-4');
      const id = isClaudeModel ? 'claude-sonnet-4' : this.models[0].id;
      modelSelect.value =id
      modelSelect.disabled = false;
    }
  }

  updateUI() {
    // 更新认证状态
    const authStatus = document.getElementById('auth-status');
    const fetchModelsBtn = document.getElementById('fetch-models');
    const chatForm = document.getElementById('chat-form');
    const sendBtn = chatForm.querySelector('button[type="submit"]');

    if (this.isAuthenticated) {
      authStatus.textContent = 'Authenticated';
      authStatus.className = 'badge bg-success';
      fetchModelsBtn.disabled = false;
      sendBtn.disabled = false;
      
      // 隐藏认证卡片，显示聊天界面
      document.querySelector('.card:first-child').classList.add('d-none');
    } else {
      authStatus.textContent = 'Not Authenticated';
      authStatus.className = 'badge bg-secondary';
      fetchModelsBtn.disabled = true;
      sendBtn.disabled = true;
    }
  }

  setupEventListeners() {
    // GitHub token 认证
    document.getElementById('github-auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('github-token').value;
      
      if (!token) return;
      
      try {
        await this.authenticateWithToken(token);
        // 清空输入框
        document.getElementById('github-token').value = '';
      } catch (error) {
        alert('Authentication failed: ' + error.message);
      }
    });

    // 聊天表单
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.sendMessage();
    });

    // 新增：System Message 自动保存
    const systemMessageElement = document.getElementById('system-message');
    if (systemMessageElement) {
      // 当用户输入时自动保存（防抖处理）
      let saveTimeout;
      systemMessageElement.addEventListener('input', (e) => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          this.saveSystemMessage(e.target.value);
        }, 1000); // 1秒后保存
      });

      // 当失去焦点时立即保存
      systemMessageElement.addEventListener('blur', (e) => {
        clearTimeout(saveTimeout);
        this.saveSystemMessage(e.target.value);
      });
    }

    // 快速重新认证按钮
    this.createQuickAuthButton();
  }

  // 新增：创建 System Message 预设功能
  createSystemMessagePresets() {
    const systemMessageContainer = document.getElementById('system-message').parentElement;
    
    // 创建预设按钮容器
    const presetDiv = document.createElement('div');
    presetDiv.className = 'mt-2';
    presetDiv.innerHTML = `
      <small class="text-muted">Quick presets:</small>
      <div class="btn-group-sm mt-1" role="group">
        <button type="button" class="btn btn-outline-secondary btn-sm" data-preset="assistant">Assistant</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-preset="coder">Coder</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-preset="translator">Translator</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-preset="clear">Clear</button>
      </div>
    `;
    
    systemMessageContainer.appendChild(presetDiv);

    // 预设内容
    const presets = {
      assistant: "You are a helpful, harmless, and honest assistant.",
      coder: "You are an expert programmer. Provide clean, efficient code with clear explanations.",
      translator: "You are a professional translator. Translate text accurately while maintaining the original meaning and tone.",
      clear: ""
    };

    // 添加点击事件
    presetDiv.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-preset')) {
        const preset = e.target.getAttribute('data-preset');
        const systemMessageElement = document.getElementById('system-message');
        systemMessageElement.value = presets[preset];
        this.saveSystemMessage(presets[preset]);
        
        // 更新按钮状态
        presetDiv.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
      }
    });
  }

 // 新增：恢复保存的 System Message
  restoreSystemMessage() {
    const savedSystemMessage = localStorage.getItem('system_message');
    if (savedSystemMessage) {
      const systemMessageElement = document.getElementById('system-message');
      if (systemMessageElement) {
        systemMessageElement.value = savedSystemMessage;
        this.defaultSystemMessage = savedSystemMessage;
      }
    }
  }

  // 新增：保存 System Message
  saveSystemMessage(message) {
    localStorage.setItem('system_message', message);
    this.defaultSystemMessage = message;
  }
  createQuickAuthButton() {
    const authCard = document.querySelector('.card:first-child .card-body');
    const quickAuthDiv = document.createElement('div');
    quickAuthDiv.className = 'mt-3 pt-3 border-top';
    quickAuthDiv.innerHTML = `
      <p class="text-muted mb-2">Quick access (if you have a token):</p>
      <div class="input-group">
        <input type="password" class="form-control" id="quick-token" placeholder="Paste token here">
        <button class="btn btn-outline-primary" type="button" id="quick-auth">Go</button>
      </div>
    `;
    authCard.appendChild(quickAuthDiv);

    document.getElementById('quick-auth').addEventListener('click', async () => {
      const token = document.getElementById('quick-token').value;
      if (token) {
        try {
          await this.authenticateWithToken(token);
          document.getElementById('quick-token').value = '';
        } catch (error) {
          alert('Quick auth failed: ' + error.message);
        }
      }
    });
  }

  async sendMessage() {
    const model = document.getElementById('model-select').value;
    const systemMessage = document.getElementById('system-message').value;
    const userMessage = document.getElementById('user-message').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const topP = parseFloat(document.getElementById('top-p').value);
    const maxTokens = parseInt(document.getElementById('max-tokens').value);

    if (!model || !userMessage) {
      alert('Please select a model and enter a message');
      return;
    }

    const responseContainer = document.getElementById('response-container');
    const responseContent = document.getElementById('response-content');
    const responseLoading = document.getElementById('response-loading');

    responseContainer.classList.remove('d-none');
    responseLoading.style.display = 'block';
    responseContent.style.display = 'none';

    try {
      const messages = [];
      if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
      }
      messages.push({ role: 'user', content: userMessage });

      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentToken}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
          stream: true
        })
      });

      if (!response.ok) throw new Error('Chat request failed');

      responseLoading.style.display = 'none';
      responseContent.style.display = 'block';
      responseContent.innerHTML = '';

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0].delta.content) {
                responseContent.innerHTML += data.choices[0].delta.content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

    } catch (error) {
      responseLoading.style.display = 'none';
      responseContent.style.display = 'block';
      responseContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new CopilotChat();
});