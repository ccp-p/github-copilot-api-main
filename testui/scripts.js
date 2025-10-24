class CopilotChat {
  constructor() {
    this.apiBaseUrl = this.getApiBaseUrl();
    this.isAuthenticated = false;
    this.models = [];
    this.currentToken = null;
    this.conversationHistory = [];
    this.maxHistoryLength = 50;
    this.useHistory = false; // 新增：历史记录开关，默认关闭
    
    this.init();
  }
  // 新增：清除对话历史
  clearConversationHistory() {
    this.conversationHistory = [];
    this.saveConversationHistory();
    this.updateChatDisplay();
  }
  
  // 新增：保存对话历史到本地存储
  saveConversationHistory() {
    localStorage.setItem('conversation_history', JSON.stringify(this.conversationHistory));
  }
  
  // 新增：从本地存储恢复对话历史
  restoreConversationHistory() {
    const saved = localStorage.getItem('conversation_history');
    if (saved) {
      try {
        this.conversationHistory = JSON.parse(saved);
        this.updateChatDisplay();
      } catch (error) {
        console.error('Failed to restore conversation history:', error);
        this.conversationHistory = [];
      }
    }
  }
  
  // 新增：添加消息到历史记录
  addMessageToHistory(role, content) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    
    // 限制历史记录长度
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
    
    this.saveConversationHistory();
  }
  
  // 新增：更新聊天界面显示
  updateChatDisplay() {
    const chatContainer = document.getElementById('chat-history');
    if (!chatContainer) return;
    
    chatContainer.innerHTML = '';
    
    if (this.conversationHistory.length === 0) {
      chatContainer.innerHTML = `<p class="text-muted text-center">No conversation history yet. Start chatting!</p>`;
      return;
    }
    
    this.conversationHistory.forEach(message => {
      if (message.role === 'user' || message.role === 'assistant') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role}-message mb-3`;
        messageDiv.innerHTML = `
          <div class="message-header d-flex justify-content-between align-items-center mb-2">
            <strong class="message-role">
              ${message.role === 'user' ? '👤 You' : '🤖 Assistant'}
            </strong>
            <small class="text-muted">${new Date(message.timestamp).toLocaleTimeString()}</small>
          </div>
          <div class="message-content markdown-body">${this.formatMessageContent(message.content)}</div>
        `;
        chatContainer.appendChild(messageDiv);
      }
    });
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
  
  // 新增：格式化消息内容
  formatMessageContent(content) {
    if (typeof marked !== 'undefined') {
      try {
        return marked.parse(content);
      } catch (error) {
        return this.basicFormatText(content);
      }
    } else {
      return this.basicFormatText(content);
    }
  }
  getApiBaseUrl() {
    const hostname = window.location.hostname;
    
    // // 本地开发环境

    
    // 线上环境 - 使用服务器 IP
    if (hostname === '8.134.32.71') {
      return 'http://8.134.32.71:3000/api';
    }
    return 'http://8.134.32.71:3000/api';
    // 默认使用当前域名的 3000 端口
    return `http://${hostname}:3000/api`;
  }
async init() {
  // 初始化主题
  this.initTheme();
  // 创建主题切换按钮
  this.createThemeToggle();
  
  // 加载自定义预设
  window.presetManager.loadCustomPresets();
  // 页面加载时自动尝试恢复会话
  await this.tryRestoreSession();
  this.restoreSystemMessage(); // 恢复系统消息
  this.restoreConversationHistory(); // 新增：恢复对话历史
  this.createSystemMessagePresets(); // 创建预设按钮
  this.createChatInterface(); // 新增：创建聊天界面

  this.setupEventListeners();
}
// 新增：创建聊天界面
createChatInterface() {
  // 在用户消息输入框上方添加聊天历史显示区域
  const userMessageContainer = document.getElementById('user-message').parentElement;
  
  // 创建聊天历史容器
  const chatHistoryContainer = document.createElement('div');
  chatHistoryContainer.className = 'mb-3';
  chatHistoryContainer.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <label class="form-label mb-0">
        Chat History
        <span class="badge bg-secondary ms-2" id="history-status">Disabled</span>
      </label>
      <div class="btn-group" role="group">
        <button type="button" class="btn btn-outline-primary btn-sm" id="toggle-history-mode">
          <i class="bi bi-toggle-off"></i> Enable History
        </button>
        <button type="button" class="btn btn-outline-info btn-sm" id="toggle-history-display">
          <i class="bi bi-eye"></i> Show
        </button>
        <button type="button" class="btn btn-outline-warning btn-sm" id="clear-history">
          <i class="bi bi-trash"></i> Clear
        </button>
      </div>
    </div>
    <div id="chat-history" class="chat-history-container" style="display: none; max-height: 400px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 0.375rem; padding: 1rem; background-color: var(--bs-body-bg);">
      <p class="text-muted text-center">No conversation history yet. Start chatting!</p>
    </div>
  `;
  
  userMessageContainer.parentElement.insertBefore(chatHistoryContainer, userMessageContainer);
  
  // 恢复历史记录开关状态
  this.restoreHistoryMode();
  
  // 绑定事件
  document.getElementById('toggle-history-mode').addEventListener('click', () => {
    this.toggleHistoryMode();
  });
  
  document.getElementById('toggle-history-display').addEventListener('click', () => {
    const historyContainer = document.getElementById('chat-history');
    if (historyContainer.style.display === 'none') {
      historyContainer.style.display = 'block';
      document.getElementById('toggle-history-display').innerHTML = '<i class="bi bi-eye-slash"></i> Hide';
    } else {
      historyContainer.style.display = 'none';
      document.getElementById('toggle-history-display').innerHTML = '<i class="bi bi-eye"></i> Show';
    }
  });
  
  document.getElementById('clear-history').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all conversation history?')) {
      this.clearConversationHistory();
    }
  });
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
    // 新增：初始化主题
  initTheme() {
    // 从 localStorage 获取保存的主题，或根据系统偏好设置
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    this.currentTheme = savedTheme || systemTheme;
    
    this.applyTheme(this.currentTheme);
  }

  // 新增：应用主题
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem('theme', theme);
    
    // 更新主题切换按钮图标
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      themeToggle.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }
   // 新增：创建主题切换按钮
  createThemeToggle() {
    const themeToggle = document.createElement('button');
    themeToggle.id = 'theme-toggle';
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
    themeToggle.title = this.currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    
    themeToggle.addEventListener('click', () => {
      const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      this.applyTheme(newTheme);
    });
    
    document.body.appendChild(themeToggle);
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


   // 新增：创建 System Message 预设功能（模块化版本）
  createSystemMessagePresets() {
    const systemMessageElement = document.getElementById('system-message');
    if (!systemMessageElement) return;
    
    const systemMessageContainer = systemMessageElement.parentElement;
    
    // 创建预设按钮容器
    const presetDiv = document.createElement('div');
    presetDiv.className = 'mt-2';
    presetDiv.id = 'preset-container';
    
    // 创建预设管理界面
    const presetHTML = this.generatePresetHTML();
    presetDiv.innerHTML = presetHTML;
    systemMessageContainer.appendChild(presetDiv);
    
    // 绑定事件
    this.bindPresetEvents(presetDiv);
  }

  // 生成预设HTML
  generatePresetHTML() {
    const presets = window.presetManager.getAllPresets();
    
    let buttonsHTML = presets.map(preset => {
      const customClass = preset.isCustom ? 'custom-preset' : '';
      const deleteBtn = preset.isCustom ? `<span class="delete-preset" data-preset-id="${preset.id}">×</span>` : '';
      
      return `
        <button type="button" 
                class="btn btn-outline-secondary btn-sm preset-btn ${customClass}" 
                data-preset="${preset.id}"
                title="${preset.description}">
          ${preset.icon} ${preset.name}
          ${deleteBtn}
        </button>
      `;
    }).join('');

    return `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <small class="text-muted">Quick presets:</small>
        <div class="preset-actions">
          <button type="button" class="btn btn-outline-primary btn-sm" id="add-preset-btn">
            <i class="bi bi-plus"></i> Add
          </button>
          <button type="button" class="btn btn-outline-info btn-sm" id="manage-presets-btn">
            <i class="bi bi-gear"></i> Manage
          </button>
        </div>
      </div>
      <div class="preset-buttons-container">
        ${buttonsHTML}
      </div>
    `;
  }

  // 绑定预设事件
  bindPresetEvents(container) {
    // 预设按钮点击事件
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-btn') || e.target.closest('.preset-btn')) {
        const btn = e.target.classList.contains('preset-btn') ? e.target : e.target.closest('.preset-btn');
        const presetId = btn.getAttribute('data-preset');
        this.applyPreset(presetId);
        
        // 更新按钮状态
        container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      
      // 删除自定义预设
      if (e.target.classList.contains('delete-preset')) {
        e.stopPropagation();
        const presetId = e.target.getAttribute('data-preset-id');
        this.deleteCustomPreset(presetId);
      }
      
      // 添加预设按钮
      if (e.target.id === 'add-preset-btn' || e.target.closest('#add-preset-btn')) {
        this.showAddPresetModal();
      }
      
      // 管理预设按钮
      if (e.target.id === 'manage-presets-btn' || e.target.closest('#manage-presets-btn')) {
        this.showManagePresetsModal();
      }
    });
  }

  // 应用预设
  applyPreset(presetId) {
    const preset = window.presetManager.getPresetById(presetId);
    if (preset) {
      const systemMessageElement = document.getElementById('system-message');
      systemMessageElement.value = preset.content;
      this.saveSystemMessage(preset.content);
    }
  }

  // 删除自定义预设
  deleteCustomPreset(presetId) {
    if (confirm('Are you sure you want to delete this preset?')) {
      window.presetManager.removeCustomPreset(presetId);
      this.refreshPresetButtons();
    }
  }

  // 刷新预设按钮
  refreshPresetButtons() {
    const container = document.getElementById('preset-container');
    if (container) {
      const presetHTML = this.generatePresetHTML();
      container.innerHTML = presetHTML;
      this.bindPresetEvents(container);
    }
  }

  // 显示添加预设模态框
  showAddPresetModal() {
    const currentContent = document.getElementById('system-message').value;
    
    const modal = this.createModal('add-preset-modal', 'Add Custom Preset', `
      <form id="add-preset-form">
        <div class="mb-3">
          <label for="preset-name" class="form-label">Name</label>
          <input type="text" class="form-control" id="preset-name" required>
        </div>
        <div class="mb-3">
          <label for="preset-description" class="form-label">Description</label>
          <input type="text" class="form-control" id="preset-description">
        </div>
        <div class="mb-3">
          <label for="preset-icon" class="form-label">Icon (emoji)</label>
          <input type="text" class="form-control" id="preset-icon" placeholder="🤖" maxlength="2">
        </div>
        <div class="mb-3">
          <label for="preset-content" class="form-label">Content</label>
          <textarea class="form-control" id="preset-content" rows="8" required>${currentContent}</textarea>
        </div>
      </form>
    `, `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" id="save-preset-btn">Save Preset</button>
    `);

    // 保存预设事件
    modal.querySelector('#save-preset-btn').addEventListener('click', () => {
      this.saveCustomPreset();
    });
  }

  // 显示管理预设模态框
  showManagePresetsModal() {
    const customPresets = window.presetManager.getAllPresets().filter(p => p.isCustom);
    
    const presetsList = customPresets.length > 0 
      ? customPresets.map(preset => `
          <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
            <div>
              <strong>${preset.icon} ${preset.name}</strong>
              <small class="text-muted d-block">${preset.description}</small>
            </div>
            <button class="btn btn-outline-danger btn-sm" onclick="copilotChat.deleteCustomPreset('${preset.id}')">
              Delete
            </button>
          </div>
        `).join('')
      : '<p class="text-muted">No custom presets found.</p>';

    this.createModal('manage-presets-modal', 'Manage Presets', `
      <div class="mb-3">
        <h6>Custom Presets</h6>
        ${presetsList}
      </div>
      <div class="mb-3">
        <h6>Import/Export</h6>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm" id="export-presets-btn">Export</button>
          <button class="btn btn-outline-primary btn-sm" id="import-presets-btn">Import</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display: none;">
      </div>
    `, `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
    `);
  }

  // 保存自定义预设
  saveCustomPreset() {
    const name = document.getElementById('preset-name').value.trim();
    const description = document.getElementById('preset-description').value.trim();
    const icon = document.getElementById('preset-icon').value.trim() || '⚙️';
    const content = document.getElementById('preset-content').value.trim();

    if (!name || !content) {
      alert('Name and content are required!');
      return;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    try {
      window.presetManager.addCustomPreset({
        id: id,
        name: name,
        description: description,
        icon: icon,
        content: content
      });

      this.refreshPresetButtons();
      bootstrap.Modal.getInstance(document.getElementById('add-preset-modal')).hide();
      alert('Preset saved successfully!');
    } catch (error) {
      alert('Error saving preset: ' + error.message);
    }
  }

  // 创建模态框辅助方法
  createModal(id, title, body, footer = '') {
    // 移除已存在的模态框
    const existingModal = document.getElementById(id);
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div class="modal fade" id="${id}" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">${body}</div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById(id);
    new bootstrap.Modal(modal).show();
    
    return modal;
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

  // 添加用户消息到历史记录
  this.addMessageToHistory('user', userMessage);
  this.updateChatDisplay();

  const responseContainer = document.getElementById('response-container');
  const responseContent = document.getElementById('response-content');
  const responseLoading = document.getElementById('response-loading');

  responseContainer.classList.remove('d-none');
  responseLoading.style.display = 'block';
  responseContent.style.display = 'none';

  // 清空用户输入框
  document.getElementById('user-message').value = '';

  try {
    // 构建包含历史对话的消息数组
    const messages = [];
    
    // 添加系统消息（如果有）
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    
    // 只有在开启历史记录时才添加历史对话
    if (this.useHistory) {
      this.conversationHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    } else {
      // 如果未开启历史记录，只发送当前用户消息
      messages.push({ role: 'user', content: userMessage });
    }

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

    // 用于累积完整响应文本
    let fullResponse = '';
    
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
              fullResponse += data.choices[0].delta.content;
              
              // 实时渲染格式化内容
              this.renderFormattedResponse(fullResponse, responseContent);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    // 添加助手响应到历史记录
    if (fullResponse) {
      this.addMessageToHistory('assistant', fullResponse);
      this.updateChatDisplay();
    }

  } catch (error) {
    responseLoading.style.display = 'none';
    responseContent.style.display = 'block';
    responseContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
  }
}

// 新增：格式化响应内容的渲染方法
renderFormattedResponse(text, container) {
  // 如果页面已经引入了 marked.js，使用 Markdown 渲染
  if (typeof marked !== 'undefined') {
    try {
      const htmlContent = marked.parse(text);
      container.innerHTML = `<div class="formatted-response">${htmlContent}</div>`;
    } catch (error) {
      // 如果 Markdown 解析失败，使用基础格式化
      container.innerHTML = `<div class="formatted-response">${this.basicFormatText(text)}</div>`;
    }
  } else {
    // 使用基础格式化
    container.innerHTML = `<div class="formatted-response">${this.basicFormatText(text)}</div>`;
  }
  
  // 自动滚动到底部
  container.scrollTop = container.scrollHeight;
}

// 新增：基础文本格式化方法
basicFormatText(text) {
  return text
    // 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    
    // 处理标题
    .replace(/^### (.+)$/gm, '<h3 class="response-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="response-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="response-h1">$1</h1>')
    
    // 处理粗体和斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // 处理代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    
    // 处理列表
    .replace(/^- (.+)$/gm, '<li class="list-item">$1</li>')
    .replace(/(<li class="list-item">.*<\/li>)/s, '<ul class="response-list">$1</ul>')
    
    // 处理表格（简单处理）
    .replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map(cell => `<td>${cell.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    
    // 处理换行
    .replace(/\n\n/g, '</p><p class="response-paragraph">')
    .replace(/\n/g, '<br>')
    
    // 包装段落
    .replace(/^/, '<p class="response-paragraph">')
    .replace(/$/, '</p>');
}
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  new CopilotChat();
});