# English Autotest Web

基于 Next.js + Supabase 的个人英语词汇测试平台。

## 功能概览
- 图片 OCR 识别英文并自动翻译
- 手动输入单词并自动翻译
- 自定义词表测试（英→中 / 中→英）
- 错词本自动记录与复测
- 测试历史记录与断点续测
- 用户名 + 密码注册登录

## 本地运行

1. 进入项目目录：
   ```powershell
   cd d:\python-learning\English_autotest_web
   ```
2. 安装依赖：
   ```powershell
   npm install
   ```
3. 复制环境变量：
   ```powershell
   copy .env.example .env.local
   ```
4. 填写 `.env.local` 中的参数。
5. 启动：
   ```powershell
   npm run dev
   ```

## Supabase 设置

1. 注册 Supabase 账号并创建项目。
2. 进入 SQL Editor，执行 `supabase/schema.sql`。
3. 在 Project Settings → API 中获取 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`。
4. 把它们写入 `.env.local` 或 Vercel 环境变量。

## DashScope 设置

在阿里云 DashScope 获取 API Key。配置如下：
- `DASHSCOPE_API_KEY`
- `DASHSCOPE_BASE_URL`（默认已写入模板）
- `QWEN_VL_MODEL=qwen3-vl-plus`
- `QWEN_TEXT_MODEL=qwen-turbo`

## 部署到 Vercel

1. 将项目推送到 GitHub 公开仓库。
2. 在 Vercel 导入仓库并选择仓库根目录。
3. 设置环境变量（同 `.env.local`）。
4. 部署完成后即可访问。

## 安全提示

- 生产环境请务必使用强密码。
- API Key 必须放在 Vercel 环境变量中，不可暴露在前端。
