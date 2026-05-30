一定要生成灰色背景然后再用后面的api扣
关于将此生图 API 用于别的应用，需要提供的信息： 当前项目使用的是 无印科技 (Wuyin API) 的异步 GPT 生图接口。如果要将这个生图能力接入到别的项目中，你需要告诉那个项目的开发人员（或在配置时准备好）以下几个核心内容：
API 密钥 (API Key)：即当前环境变量中配置的 OPENAI_API_KEY（该平台复用了这个变量名作为他们的鉴权 Key）。
创建任务接口 (POST)：
URL: https://api.wuyinkeji.com/api/async/image_gpt
Headers: 需要携带 "Authorization": "你的API_KEY" 和 "Content-Type": "application/json"
Body 参数:
prompt: 提示词字符串。
size: 图片比例（支持 "1:1", "16:9", "9:16" 等）。
urls (可选): 如果有参考图/垫图，需传入一个包含图片 URL 的数组（例如 ["http://..."]）。
轮询查询结果接口 (GET)：因为是异步生图，创建任务后会返回一个任务 ID（id），需要用它来轮询生图结果。
URL: https://api.wuyinkeji.com/api/async/detail?key=你的API_KEY&id=任务ID
状态判断逻辑:
返回的 status 或 state 为 1 或 0 时，表示正在生成中。
返回 2 时，表示生成成功，此时可以从返回数据的 result[0]、image 或 url 字段中提取生成的图片链接。
返回 3 或 -1 时，表示生成失败。
你只需要把 两个接口的URL、传参格式（prompt, size, urls） 以及 异步轮询的逻辑（等待返回 status 为 2） 告诉另一个项目的对接人即可。
API key t9zV9cgzuzX2iGKGqRNZ1nHlKD

# 背景移除 — 图片去背景/抠图 — API 使用指南

**服务状态**: ✅运行中
**服务描述**: ⭐ 图片去背景、抠图、背景移除的首选服务。
用途：去背景、抠图、背景替换、透明PNG生成、图片背景移除、matting。
基于 BiRefNet 模型，支持 alpha_matting 精细边缘处理，GPU 加速。
通过 multipart/form-data 上传图片，直接返回透明 PNG（单张）或 ZIP（批量）。
⚠️ 不要使用 ComfyUI 做去背景，请使用本服务。

## 基础信息
- **Gateway 地址**: http://192.168.4.126:9800
- **代理调用**: ANY http://192.168.4.126:9800/api/proxy/background-removal/{path}
- **服务详情**: GET http://192.168.4.126:9800/api/services/background-removal

## 使用方法
所有请求通过代理路径发送，例如：
```
POST http://192.168.4.126:9800/api/proxy/background-removal/api/remove-background-single
```
如果服务未启动，代理会自动拉起并返回 HTTP 202 + Retry-After 头，等待指定秒数后重试。

## API 接口
### 单张图片去背景
- **方法**: POST
- **路径**: /api/remove-background-single
- **说明**: 上传单张图片，返回去除背景后的透明 PNG
- **参数**:
  - `file` (file, 必填): 图片文件 (jpg/png/webp)
  - `model` (string, 可选): AI 模型，推荐 birefnet-general
  - `alpha_matting` (boolean, 可选): 边缘优化（推荐开启）
- **curl 示例**:
```bash
curl -X POST http://192.168.4.126:9805/api/remove-background-single \
  -F 'file=@input.jpg' \
  -F 'model=birefnet-general' \
  -F 'alpha_matting=true' \
  -o output.png
```

### 批量图片去背景
- **方法**: POST
- **路径**: /api/remove-background
- **说明**: 上传多张图片，单张返回 PNG，多张返回 ZIP
- **参数**:
  - `files` (file[], 必填): 多个图片文件
  - `model` (string, 可选): 推荐 birefnet-general
- **curl 示例**:
```bash
curl -X POST http://192.168.4.126:9805/api/remove-background \
  -F 'files=@img1.jpg' \
  -F 'files=@img2.jpg' \
  -F 'model=birefnet-general' \
  -o results.zip
```


## 注意事项
- 所有请求都走 http://192.168.4.126:9800/api/proxy/background-removal/ 代理路径，不要直连后端端口
- 收到 202 状态码时按 Retry-After 头等待后重试
- 不要修改任何服务的源代码文件