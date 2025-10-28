@echo off
setlocal
chcp 65001 >nul
echo ===================================
echo  启动 GitHub Copilot API 服务
echo ===================================

:: 切换到项目目录
cd /d "%~dp0"

:: 检查Node.js是否已安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [错误] 未检测到Node.js，请先安装Node.js
  echo 您可以从 https://nodejs.org 下载并安装
  pause
  exit /b 1
)

:: 检查并安装依赖
if not exist node_modules (
  echo [信息] 正在安装依赖项...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
  )
)

:: 设置代理环境变量
set HTTP_PROXY=http://127.0.0.1:7890
set HTTPS_PROXY=http://127.0.0.1:7890
set NO_PROXY=localhost,127.0.0.1

echo [信息] 代理配置: %HTTP_PROXY%

:: 启动服务
echo [信息] 启动 GitHub Copilot API 服务...
echo [信息] 请保持此窗口打开，关闭窗口将停止服务
echo [信息] 按 Ctrl+C 可停止服务

:: 假设入口文件是index.js，根据实际情况调整
call node src/index.js

:: 如果服务停止，等待用户确认
echo.
echo [信息] 服务已停止
pause