# 背景移除 — 图片去背景/抠图 — API 使用指南

**服务状态**: ✅运行中
**服务描述**: ⭐ 图片去背景、抠图、背景移除的首选服务。
用途：去背景、抠图、背景替换、透明PNG生成、图片背景移除、matting。
基于 BiRefNet 模型，支持 alpha_matting 精细边缘处理，GPU 加速。
通过 multipart/form-data 上传图片，直接返回透明 PNG（单张）或 ZIP（批量）。
⚠️ 不要使用 ComfyUI 做去背景，请使用本服务。

## 基础信息
- **Gateway 地址**: http://k165.com:9800
- **代理调用**: ANY http://k165.com:9800/api/proxy/background-removal/{path}
- **服务详情**: GET http://k165.com:9800/api/services/background-removal

## 使用方法
所有请求通过代理路径发送，例如：
```
POST http://k165.com:9800/api/proxy/background-removal/api/remove-background-single
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
curl -X POST http://k165.com:9801/api/remove-background-single \
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
curl -X POST http://k165.com:9801/api/remove-background \
  -F 'files=@img1.jpg' \
  -F 'files=@img2.jpg' \
  -F 'model=birefnet-general' \
  -o results.zip
```


## 注意事项
- 所有请求都走 http://k165.com:9800/api/proxy/background-removal/ 代理路径，不要直连后端端口
- 收到 202 状态码时按 Retry-After 头等待后重试
- 不要修改任何服务的源代码文件