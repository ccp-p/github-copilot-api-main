const axios = require('axios');

// 兼容新旧版本的导入方式
let HttpsProxyAgent;
try {
  // 尝试新版本导入方式
  HttpsProxyAgent = require('https-proxy-agent').HttpsProxyAgent;
} catch (e) {
  // 降级到旧版本导入方式
  HttpsProxyAgent = require('https-proxy-agent');
}

// 代理配置
const PROXY_URL = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7890';

const createAxiosInstance = (headers = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const config = {
    headers: {
      ...defaultHeaders,
      ...headers
    },
    timeout: 30000
  };

  // 如果配置了代理,则使用代理
  if (PROXY_URL) {
    const proxyAgent = new HttpsProxyAgent(PROXY_URL);
    config.httpAgent = proxyAgent;
    config.httpsAgent = proxyAgent;
    config.proxy = false; // 禁用 axios 默认代理,使用 agent
    
    console.log(`[Proxy] 使用代理: ${PROXY_URL}`);
  }

  return axios.create(config);
};

const createCopilotHeaders = (token, intentType = 'model-access') => {
  return {
    'authorization': `Bearer ${token}`,
    'copilot-integration-id': 'vscode-chat',
    'editor-plugin-version': 'copilot-chat/0.25.1',
    'editor-version': 'vscode/1.98.2',
    'openai-intent': intentType,
    'user-agent': 'GitHubCopilotChat/0.25.1',
    'x-github-api-version': '2024-12-15'
  };
};

const createGitHubHeaders = (token) => {
  return {
    'authorization': `token ${token}`,
    'editor-plugin-version': 'copilot-chat/0.25.1',
    'editor-version': 'vscode/1.98.2',
    'user-agent': 'GitHubCopilotChat/0.25.1',
    'x-github-api-version': '2024-12-15'
  };
};

module.exports = {
  createAxiosInstance,
  createCopilotHeaders,
  createGitHubHeaders
};