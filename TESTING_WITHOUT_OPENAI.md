# 🧪 无 OpenAI API Key 测试指南

## ✅ 系统可以在没有 OpenAI API Key 的情况下运行

系统已经设计为**渐进式增强**：
- **没有 API Key**：使用基于传感器数据的 fallback 分析
- **有 API Key**：使用 OpenAI Vision API 进行高级图像分析

## 🚀 测试步骤（无需 OpenAI API Key）

### 1. 确保后端运行

```bash
cd apps/backend
python main.py
```

后端应该正常启动，即使没有 `OPENAI_API_KEY` 环境变量。

### 2. 确保前端运行

```bash
cd apps/frontend
npm run dev
```

### 3. 发送一些传感器数据（可选）

```bash
cd apps/device_simulator
python device_simulator.py
```

这会发送模拟的传感器数据，让系统有数据可以分析。

### 4. 在 iPhone Chrome 上测试

1. **打开 Chrome 浏览器**
2. **访问**: `http://10.0.0.33:3000`（替换为您的 Mac IP）
3. **测试 Dashboard**：
   - 点击「📊 Dashboard」标签
   - 应该能看到传感器数据
   - 点击「🔄 Refresh」刷新数据

4. **测试实时流检测**：
   - 点击「📹 實時檢測」标签
   - 应该看到绿色提示：「✅ 您正在使用 Chrome 瀏覽器，可以進行實時流檢測！」
   - 点击「▶️ 開始實時檢測」
   - 允许摄像头权限
   - 系统会开始分析（即使没有 OpenAI API Key）

### 5. 预期行为（无 API Key）

**实时流检测会：**
- ✅ 成功启动摄像头
- ✅ 每 2 秒捕获一帧
- ✅ 发送到后端进行分析
- ✅ 使用 **fallback 分析**（基于传感器数据）
- ⚠️ 可能不会检测到图像中的视觉问题（因为没有 AI 图像分析）
- ✅ 但会基于传感器数据检测问题（如高湿度、高 CO2 等）

**Fallback 分析会检测：**
- 高湿度（>70%）
- 高 CO2 浓度（>1000ppm）
- 高温（>30°C）

## 📊 测试检查清单

- [ ] 后端正常启动（无错误）
- [ ] 前端正常加载
- [ ] Dashboard 显示传感器数据
- [ ] 实时流检测可以启动摄像头
- [ ] 系统每 2 秒分析一次
- [ ] 如果有传感器数据，会显示基于传感器的分析结果
- [ ] 问题记录功能正常（检测到的问题会保存）

## 🔍 如何验证系统工作正常

### 检查后端日志

后端应该显示：
```
✅ Database tables created/verified
🚀 Starting Home Inspection Backend API...
INFO:     Application startup complete.
```

当收到分析请求时：
```
INFO:     127.0.0.1:xxxxx - "POST /api/rag/analyze-realtime-stream HTTP/1.1" 200 OK
```

### 检查前端控制台

打开浏览器开发者工具（在 Chrome 中），应该看到：
- 没有严重错误
- API 请求成功（200 状态码）
- 分析结果返回

### 测试传感器数据检测

1. 运行设备模拟器发送高湿度数据：
```bash
cd apps/device_simulator
# 修改 device_simulator.py 生成高湿度值（>70%）
python device_simulator.py
```

2. 在实时流检测中，系统应该检测到高湿度问题

## 🎯 添加 OpenAI API Key 后的改进

一旦您添加了 `OPENAI_API_KEY`，系统会：

1. **自动使用 OpenAI Vision API** 分析图像
2. **检测视觉问题**：
   - 结构裂缝
   - 水渍和霉菌
   - 管道泄漏迹象
   - 电气问题
   - 屋顶损坏
   - 其他安全隐患

3. **更准确的检测**：结合图像分析和传感器数据

## 📝 如何添加 OpenAI API Key

### 方法 1：环境变量

```bash
# 在 apps/backend 目录
export OPENAI_API_KEY="your-api-key-here"
python main.py
```

### 方法 2：.env 文件

在 `apps/backend/.env` 文件中添加：
```
OPENAI_API_KEY=your-api-key-here
```

### 方法 3：系统环境变量

在您的系统环境变量中设置 `OPENAI_API_KEY`

## ⚠️ 注意事项

1. **API Key 安全**：
   - 不要将 API Key 提交到 Git
   - 使用 `.env` 文件并添加到 `.gitignore`
   - 不要在前端代码中暴露 API Key

2. **API 费用**：
   - OpenAI Vision API 按使用量收费
   - 实时流检测每 2 秒分析一次
   - 建议先测试基本功能，确认无误后再启用

3. **性能**：
   - OpenAI API 调用需要时间（通常 1-3 秒）
   - 系统已经设置了 30 秒超时
   - 如果 API 调用失败，会自动回退到 fallback 分析

## 🐛 故障排除

### 问题：摄像头无法启动

**解决方案**：
- 检查 Chrome 权限设置
- 确保已授予摄像头权限
- 尝试刷新页面

### 问题：没有检测到问题

**可能原因**：
- 没有传感器数据（运行设备模拟器）
- 传感器数据都在正常范围内
- 没有 OpenAI API Key（无法检测视觉问题）

**解决方案**：
- 运行设备模拟器发送数据
- 修改模拟器生成异常值（高湿度、高 CO2 等）
- 添加 OpenAI API Key 以启用视觉分析

### 问题：后端错误

**检查**：
- 后端日志中的错误信息
- 数据库连接是否正常
- 端口 8000 是否被占用

## ✅ 测试完成后的下一步

一旦确认基本功能正常：

1. **添加 OpenAI API Key**（如上述方法）
2. **重启后端**以加载新的环境变量
3. **测试 AI 图像分析**：
   - 将摄像头对准有明显问题的区域
   - 观察 AI 是否能检测到视觉问题
   - 检查问题记录是否包含图像分析结果

## 📞 需要帮助？

如果遇到问题：
1. 检查后端和前端日志
2. 查看浏览器控制台错误
3. 确认网络连接正常
4. 验证所有服务都在运行













