const { createApp } = Vue;

createApp({
  data() {
    return {
      // 认证相关
      githubToken: '',
      isAuthenticated: false,
      authenticating: false,
      
      // UI 状态
      showSettings: false,
      showSidebar: false,
      showModelSelector: false,
      showPresetSelector: false,
      theme: 'light',
      
      // 模型相关
      models: [],
      selectedModelId: '',
      
      // 对话相关
      messages: [],
      userInput: '',
      isGenerating: false,
      uploadedImages: [],
      
      // 预设相关
      selectedPresetId: '',
      systemMessage: 'You are a helpful AI assistant.',
      allPresets: [],
      
      // 历史对话
      conversations: [],
      currentConversationId: null,
      isTemporaryConversation: false,
      
      // 生成参数
      temperature: 0.8,
      topP: 1.0,
      maxTokens: 8096,
      
      // API 配置
      apiBaseUrl: this.getApiBaseUrl(),
    };
  },
  
  computed: {
    statusClass() {
      return this.isAuthenticated ? 'status-success' : 'status-error';
    },
    
    statusText() {
      return this.isAuthenticated ? '已认证' : '未认证';
    },
    
    themeIcon() {
      return this.theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    },
    
    themeTitle() {
      return this.theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
    },
    
    selectedModel() {
      return this.models.find(m => m.id === this.selectedModelId);
    },
    
    selectedPresetName() {
      const preset = this.allPresets.find(p => p.id === this.selectedPresetId);
      return preset ? preset.name : '';
    },
    
    quickPresets() {
      // 显示前6个预设作为快速选择
      return this.allPresets.slice(0, 6);
    },
    
    canSend() {
      return this.userInput.trim() !== '' && !this.isGenerating && this.selectedModelId;
    },
  },
  
  watch: {
    selectedPresetId(newVal) {
      const preset = this.allPresets.find(p => p.id === newVal);
      if (preset) {
        this.systemMessage = preset.content;
        // 保存用户选择的角色
        localStorage.setItem('selected_preset_id', newVal);
      }
    },
    
    selectedModelId(newVal) {
      // 保存用户选择的模型
      if (newVal) {
        localStorage.setItem('selected_model_id', newVal);
      }
    },
    
    theme(newVal) {
      document.documentElement.setAttribute('data-theme', newVal);
      localStorage.setItem('theme', newVal);
    },
  },
  
  mounted() {
    this.init();
    
    // 添加代码复制事件监听
    document.addEventListener('click', this.copyCode);
  },
  
  beforeUnmount() {
    // 移除事件监听
    document.removeEventListener('click', this.copyCode);
  },
  
  methods: {
    async init() {
      // 初始化主题
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        this.theme = savedTheme;
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme = 'dark';
      }
      document.documentElement.setAttribute('data-theme', this.theme);
      
      // 加载预设
      this.loadPresets();
      
      // 尝试从本地存储恢复认证
      const savedToken = localStorage.getItem('github_token');
      if (savedToken) {
        this.githubToken = savedToken;
        await this.authenticate();
      }
      
      // 恢复用户选择的角色
      const savedPresetId = localStorage.getItem('selected_preset_id');
      if (savedPresetId && this.allPresets.find(p => p.id === savedPresetId)) {
        this.selectedPresetId = savedPresetId;
      } else if (this.allPresets.length > 0) {
        // 如果没有保存的 preset，默认选择第一个
        this.selectedPresetId = this.allPresets[0].id;
      }
      
      // 恢复用户选择的模型
      const savedModelId = localStorage.getItem('selected_model_id');
      if (savedModelId) {
        this.selectedModelId = savedModelId;
      }
      
      // 加载对话历史
      this.loadConversations();
    },
    
    getApiBaseUrl() {
      const hostname = window.location.hostname;
      if (hostname === '8.134.32.71' || hostname === 'localhost') {
        return 'http://8.134.32.71:3000/api';
      }
      return `http://${hostname}:3000/api`;
    },
    
    loadPresets() {
      // 从 PresetManager 加载所有预设(包括内置和自定义)
      if (window.presetManager) {
        window.presetManager.loadCustomPresets(); // 先加载自定义预设
        this.allPresets = window.presetManager.getAllPresets();
      } else if (window.SYSTEM_MESSAGE_PRESETS) {
        // 降级方案:直接使用全局数组
        this.allPresets = window.SYSTEM_MESSAGE_PRESETS;
      }
    },
    
    async authenticate() {
      if (!this.githubToken) {
        alert('请输入 GitHub Token');
        return;
      }
      
      this.authenticating = true;
      
      try {
        const response = await fetch(`${this.apiBaseUrl}/auth/github`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: this.githubToken }),
        });
        
        if (!response.ok) {
          throw new Error('认证失败');
        }
        
        const data = await response.json();
        
        if (data.token) {
          this.isAuthenticated = true;
          localStorage.setItem('github_token', this.githubToken);
          
          // 加载模型列表
          await this.fetchModels();
        }
      } catch (error) {
        console.error('Authentication error:', error);
        alert('认证失败: ' + error.message);
        this.isAuthenticated = false;
      } finally {
        this.authenticating = false;
      }
    },
    
    async fetchModels() {
      try {
        const response = await fetch(`${this.apiBaseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${this.githubToken}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('获取模型列表失败');
        }
        
        const data = await response.json();
        this.models = data.data || [];
        
        // 如果没有选择模型，默认选择第一个
        if (!this.selectedModelId && this.models.length > 0) {
          // 尝试恢复之前选择的模型
          const savedModelId = localStorage.getItem('selected_model_id');
          if (savedModelId && this.models.find(m => m.id === savedModelId)) {
            this.selectedModelId = savedModelId;
          } else {
            this.selectedModelId = this.models[0].id;
          }
        }
      } catch (error) {
        console.error('Fetch models error:', error);
        alert('获取模型列表失败: ' + error.message);
      }
    },
    
    logout() {
      this.isAuthenticated = false;
      this.githubToken = '';
      this.models = [];
      this.selectedModelId = '';
      this.messages = [];
      localStorage.removeItem('github_token');
      this.showSettings = false;
    },
    
    selectPreset(presetId) {
      this.selectedPresetId = presetId;
      this.showPresetSelector = false;
    },
    
    selectModel(modelId) {
      this.selectedModelId = modelId;
      this.showModelSelector = false;
    },
    
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
    },
    
    async sendMessage() {
      if (!this.canSend) return;
      
      const userMessage = this.userInput.trim();
      const images = [...this.uploadedImages];
      
      // 添加用户消息
      this.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        images: images.map(img => img.dataUrl),
      });
      
      this.userInput = '';
      this.uploadedImages = [];
      this.isGenerating = true;
      
      // 滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom();
      });
      
      // 添加一个空的助手消息用于流式更新
      const assistantMessageIndex = this.messages.length;
      this.messages.push({
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      });
      
      try {
        // 准备消息内容
        let messageContent = userMessage;
        
        // 如果有图片且模型支持vision，构建特殊格式
        if (images.length > 0 && this.selectedModel && this.selectedModel.capabilities.supports.vision) {
          messageContent = [
            { type: 'text', text: userMessage }
          ];
          
          // 添加图片
          images.forEach(img => {
            messageContent.push({
              type: 'image_url',
              image_url: {
                url: img.dataUrl
              }
            });
          });
        }
        
        // 构建消息数组
        const messages = [
          { role: 'system', content: this.systemMessage }
        ];
        
        // 添加历史消息（最近10条，排除刚添加的空助手消息）
        const recentMessages = this.messages.slice(-11, -1).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        messages.push(...recentMessages);
        
        // 调用 API
        const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.selectedModelId,
            messages: messages,
            temperature: this.temperature,
            top_p: this.topP,
            max_tokens: this.maxTokens,
            stream: true,
          }),
        });
        
        if (!response.ok) {
          throw new Error('API 请求失败');
        }
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // 保留最后一个可能不完整的行
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              
              if (data === '[DONE]') {
                continue;
              }
              
              try {
                const json = JSON.parse(data);
                
                if (json.choices && json.choices[0] && json.choices[0].delta) {
                  const delta = json.choices[0].delta;
                  
                  if (delta.content) {
                    // 更新助手消息内容
                    this.messages[assistantMessageIndex].content += delta.content;
                    
                    // 自动滚动到底部
                    this.$nextTick(() => {
                      this.scrollToBottom();
                    });
                  }
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', data, e);
              }
            }
          }
        }
        
        // 如果助手消息为空，说明出错了
        if (!this.messages[assistantMessageIndex].content) {
          throw new Error('未收到有效响应');
        }
        
        // 保存对话
        this.saveCurrentConversation();
        
      } catch (error) {
        console.error('Send message error:', error);
        alert('发送消息失败: ' + error.message);
        
        // 移除用户消息和空的助手消息
        this.messages.splice(assistantMessageIndex - 1, 2);
      } finally {
        this.isGenerating = false;
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    
    triggerImageUpload() {
      this.$refs.imageInput.click();
    },
    
    async handleImageUpload(event) {
      const files = event.target.files;
      
      if (!files || files.length === 0) return;
      
      // 检查模型是否支持vision
      if (!this.selectedModel || !this.selectedModel.capabilities.supports.vision) {
        alert('当前模型不支持图片上传');
        return;
      }
      
      // 限制图片数量
      const maxImages = this.selectedModel.capabilities.limits.vision?.max_prompt_images || 1;
      if (this.uploadedImages.length + files.length > maxImages) {
        alert(`最多只能上传 ${maxImages} 张图片`);
        return;
      }
      
      for (let file of files) {
        // 检查文件类型
        const supportedTypes = this.selectedModel.capabilities.limits.vision?.supported_media_types || [];
        if (!supportedTypes.includes(file.type)) {
          alert(`不支持的图片格式: ${file.type}`);
          continue;
        }
        
        // 检查文件大小
        const maxSize = this.selectedModel.capabilities.limits.vision?.max_prompt_image_size || 3145728;
        if (file.size > maxSize) {
          alert(`图片大小不能超过 ${(maxSize / 1024 / 1024).toFixed(1)} MB`);
          continue;
        }
        
        // 读取图片为 base64
        const dataUrl = await this.readFileAsDataURL(file);
        this.uploadedImages.push({
          file: file,
          dataUrl: dataUrl,
        });
      }
      
      // 清空input
      event.target.value = '';
    },
    
    readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    
    removeImage(index) {
      this.uploadedImages.splice(index, 1);
    },
    
    formatMessage(content) {
      if (typeof marked !== 'undefined') {
        try {
          const html = marked.parse(content);
          // 为代码块添加复制按钮和语言标签
          return this.addCodeBlockEnhancements(html);
        } catch (error) {
          return this.escapeHtml(content).replace(/\n/g, '<br>');
        }
      }
      return this.escapeHtml(content).replace(/\n/g, '<br>');
    },
    
    addCodeBlockEnhancements(html) {
      // 使用 DOM 解析器处理 HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // 查找所有代码块
      const codeBlocks = doc.querySelectorAll('pre code');
      
      codeBlocks.forEach((codeBlock, index) => {
        const pre = codeBlock.parentElement;
        
        // 获取语言类型
        let language = 'text';
        const classList = Array.from(codeBlock.classList);
        const langClass = classList.find(cls => cls.startsWith('language-'));
        if (langClass) {
          language = langClass.replace('language-', '');
        }
        
        // 获取代码内容
        const code = codeBlock.textContent;
        
        // 创建包装容器
        const wrapper = doc.createElement('div');
        wrapper.className = 'code-block-wrapper';
        
        // 创建头部工具栏
        const toolbar = doc.createElement('div');
        toolbar.className = 'code-block-toolbar';
        
        // 创建语言标签
        const langLabel = doc.createElement('span');
        langLabel.className = `code-lang code-lang-${language}`;
        langLabel.textContent = language.toUpperCase();
        
        // 创建复制按钮
        const copyBtn = doc.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.setAttribute('data-code', code);
        copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> 复制';
        
        toolbar.appendChild(langLabel);
        toolbar.appendChild(copyBtn);
        
        // 将 pre 元素包装起来
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(toolbar);
        wrapper.appendChild(pre);
      });
      
      return doc.body.innerHTML;
    },
    
    copyCode(event) {
      const button = event.target.closest('.code-copy-btn');
      if (!button) return;
      
      const code = button.getAttribute('data-code');
      
      // 使用 Clipboard API 复制
      navigator.clipboard.writeText(code).then(() => {
        // 显示复制成功提示
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="bi bi-check2"></i> 已复制';
        button.classList.add('copied');
        
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.classList.remove('copied');
        }, 2000);
      }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    formatTime(date) {
      if (!(date instanceof Date)) {
        date = new Date(date);
      }
      
      const now = new Date();
      const diff = now - date;
      
      // 小于1分钟
      if (diff < 60000) {
        return '刚刚';
      }
      
      // 小于1小时
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`;
      }
      
      // 小于24小时
      if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`;
      }
      
      // 显示日期和时间
      return date.toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    
    clearHistory() {
      if (!confirm('确定要清空所有对话历史吗？')) return;
      
      this.messages = [];
      this.conversations = [];
      this.currentConversationId = null;
      localStorage.removeItem('conversations');
    },
    
    newTemporaryConversation() {
      if (this.messages.length > 0 && !this.isTemporaryConversation) {
        if (!confirm('当前对话未保存，确定要创建新的临时对话吗？')) {
          return;
        }
      }
      
      this.messages = [];
      this.currentConversationId = null;
      this.isTemporaryConversation = true;
      this.showSidebar = false;
      
      // 可以选择重置 preset 或保持当前选择
      // this.selectedPresetId = this.allPresets[0]?.id || '';
    },
    
    newConversation() {
      if (this.messages.length > 0 && !this.isTemporaryConversation) {
        // 如果当前有对话且不是临时对话，先保存
        this.saveCurrentConversation();
      }
      
      this.messages = [];
      this.currentConversationId = null;
      this.isTemporaryConversation = false;
      this.showSidebar = false;
    },
    
    saveCurrentConversation() {
      // 临时对话不保存
      if (this.isTemporaryConversation) {
        return;
      }
      
      if (this.messages.length === 0) return;
      
      const title = this.messages[0].content.substring(0, 30) + '...';
      
      const conversation = {
        id: this.currentConversationId || Date.now(),
        title: title,
        messages: this.messages,
        timestamp: new Date(),
        presetId: this.selectedPresetId,
        modelId: this.selectedModelId,
      };
      
      // 如果是新对话
      if (!this.currentConversationId) {
        this.currentConversationId = conversation.id;
        this.conversations.unshift(conversation);
      } else {
        // 更新现有对话
        const index = this.conversations.findIndex(c => c.id === this.currentConversationId);
        if (index !== -1) {
          this.conversations[index] = conversation;
        }
      }
      
      // 保存到 localStorage
      this.saveConversationsToStorage();
    },
    
    loadConversations() {
      const saved = localStorage.getItem('conversations');
      if (saved) {
        try {
          this.conversations = JSON.parse(saved);
          // 转换日期字符串为 Date 对象
          this.conversations.forEach(conv => {
            conv.timestamp = new Date(conv.timestamp);
            if (conv.messages) {
              conv.messages.forEach(msg => {
                msg.timestamp = new Date(msg.timestamp);
              });
            }
          });
        } catch (error) {
          console.error('Failed to load conversations:', error);
          this.conversations = [];
        }
      }
    },
    
    saveConversationsToStorage() {
      try {
        localStorage.setItem('conversations', JSON.stringify(this.conversations));
      } catch (error) {
        console.error('Failed to save conversations:', error);
      }
    },
    
    loadConversation(conversationId) {
      const conv = this.conversations.find(c => c.id === conversationId);
      if (conv) {
        this.messages = [...conv.messages];
        this.currentConversationId = conv.id;
        this.isTemporaryConversation = false;
        
        // 恢复预设和模型
        if (conv.presetId) {
          this.selectedPresetId = conv.presetId;
        }
        if (conv.modelId) {
          this.selectedModelId = conv.modelId;
        }
        
        this.showSidebar = false;
        
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
    
    deleteConversation(conversationId) {
      if (!confirm('确定要删除这个对话吗？')) return;
      
      const index = this.conversations.findIndex(c => c.id === conversationId);
      if (index !== -1) {
        this.conversations.splice(index, 1);
        this.saveConversationsToStorage();
        
        // 如果删除的是当前对话，清空消息
        if (this.currentConversationId === conversationId) {
          this.messages = [];
          this.currentConversationId = null;
        }
      }
    },
  },
}).mount('#app');
