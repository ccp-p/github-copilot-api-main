require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const modelsRoutes = require('./routes/models.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 打印代理配置信息
if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  console.log('=================================');
  console.log('代理配置已启用:');
  console.log('HTTP_PROXY:', process.env.HTTP_PROXY);
  console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY);
  console.log('NO_PROXY:', process.env.NO_PROXY);
  console.log('=================================');
} else {
  console.log('未配置代理,将直接连接');
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, '../testui')));

app.use('/api/auth', authRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`可以通过以下地址访问:`);
  console.log(`- http://localhost:${PORT}`);
  console.log(`- http://127.0.0.1:${PORT}`);
});