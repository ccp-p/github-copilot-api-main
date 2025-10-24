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
      // 从 presets.js 加载预设
      if (window.SYSTEM_MESSAGE_PRESETS) {
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
        
        // 添加历史消息（最近10条）
        const recentMessages = this.messages.slice(-10).map(msg => ({
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
            stream: false,
          }),
        });
        
        if (!response.ok) {
          throw new Error('API 请求失败');
        }
        
        const data = await response.json();
        
        // 添加助手回复
        if (data.choices && data.choices[0]) {
          this.messages.push({
            role: 'assistant',
            content: data.choices[0].message.content,
            timestamp: new Date(),
          });
        }
        
        // 保存对话
        this.saveCurrentConversation();
        
      } catch (error) {
        console.error('Send message error:', error);
        alert('发送消息失败: ' + error.message);
        
        // 移除用户消息
        this.messages.pop();
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
          return marked.parse(content);
        } catch (error) {
          return this.escapeHtml(content).replace(/\n/g, '<br>');
        }
      }
      return this.escapeHtml(content).replace(/\n/g, '<br>');
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
    
    saveCurrentConversation() {
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
        
        // 恢复预设和模型
        if (conv.presetId) {
          this.selectedPresetId = conv.presetId;
        }
        if (conv.modelId) {
          this.selectedModelId = conv.modelId;
        }
        
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    },
  },
}).mount('#app');
