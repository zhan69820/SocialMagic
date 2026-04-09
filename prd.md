# SocialMagic — 产品需求文档 (PRD)

> 版本: v1.0 | 角色: 资深产品经理 | 日期: 2026-04-09

---

## 1. 产品概述

### 1.1 产品定位

SocialMagic 是一款面向内容创作者和运营人员的社交文案生成工具。用户通过输入素材（URL 抓取 / 文件上传 / 手动粘贴），一键生成适配小红书、微信朋友圈、抖音、微博四大平台的风格化文案。

### 1.2 目标用户

| 用户画像 | 核心诉求 |
|---------|---------|
| 自媒体博主 | 高效产出多平台内容，减少重复改写 |
| 电商运营 | 批量生成商品推广文案 |
| 品牌营销人员 | 保持品牌调性一致，快速响应热点 |

### 1.3 核心价值主张

一次素材输入 → 四平台风格文案 → 一键复制发布

---

## 2. 数据模型

### 2.1 素材源 (Source)

```
Source {
  id: string              // UUID
  type: "url" | "file" | "text"  // 素材来源类型
  content: string         // 解析后的纯文本内容
  raw_url?: string        // 原始 URL（type=url 时）
  file_name?: string      // 原始文件名（type=file 时）
  file_type?: string      // MIME 类型（type=file 时，支持 pdf/docx/png/jpg）
  metadata?: {            // 抓取/解析元信息
    title?: string
    description?: string
    image_urls?: string[]
  }
  created_at: datetime
}
```

### 2.2 平台设置 (PlatformConfig)

```
PlatformConfig {
  platform: "xiaohongshu" | "wechat" | "douyin" | "weibo"
  display_name: string
  max_length: number          // 文案字数上限
  hashtag_style: string       // 话题标签格式（如 #标签# vs #标签）
  emoji_density: "high" | "medium" | "low"  // 表情密度偏好
  tone: string                // 默认语调描述
  structure_template: string  // 文案结构模板（系统内置）
}
```

**各平台默认配置：**

| 平台 | 字数上限 | 话题标签 | 表情密度 | 默认语调 |
|------|---------|---------|---------|---------|
| 小红书 | 1000 字 | #标签空格 | 高 | 种草分享、亲切姐妹风 |
| 微信朋友圈 | 1500 字 | 无话题标签 | 中 | 个人随笔、生活感 |
| 抖音 | 300 字 | #标签空格 | 中 | 短平快、有节奏感 |
| 微博 | 2000 字 | #标签# | 低 | 观点鲜明、网感强 |

### 2.3 生成文案 (GeneratedCopy)

```
GeneratedCopy {
  id: string              // UUID
  source_id: string       // 关联素材 ID
  platform: PlatformConfig.platform
  content: string         // 生成的文案正文
  tone_used: string       // 实际使用的语调
  model_used: string      // 调用的 AI 模型标识
  token_count: number     // 消耗 token 数
  created_at: datetime
}
```

### 2.4 生成会话 (Session)

```
Session {
  id: string              // UUID
  sources: Source[]           // 本次会话的素材列表
  generated_copies: GeneratedCopy[]  // 生成的文案列表
  selected_platforms: string[]  // 用户勾选的目标平台
  status: "draft" | "generating" | "completed" | "error"
  created_at: datetime
  updated_at: datetime
}
```

---

## 3. 功能需求

### 3.1 素材输入模块

#### F1 — URL 网页抓取

- 用户在输入框粘贴 URL
- 系统通过服务端 API 抓取网页正文，剥离广告和导航
- 提取页面标题、摘要、正文作为素材
- 支持的 URL 类型：新闻页、博客文章、商品页（淘宝/京东/拼多多）
- 抓取失败时展示友好错误提示，引导用户手动粘贴

#### F2 — 本地文件上传

- 支持格式：PDF、Word (.docx)、图片 (PNG/JPG/JPEG)
- PDF/Word：提取纯文本内容
- 图片：调用 OCR 提取文字（或作为图片素材传入 AI 多模态模型）
- 单文件大小上限：10 MB
- 单次会话最多上传 5 个文件

#### F3 — 手动文本输入

- 提供多行文本输入区域
- 支持粘贴带格式的文本，系统自动清洗为纯文本
- 字数实时统计显示

### 3.2 平台选择模块

#### F4 — 目标平台勾选

- 展示四大平台卡片（小红书、微信朋友圈、抖音、微博）
- 用户至少勾选一个平台才能触发生成
- 每个平台卡片显示字数限制和风格摘要
- 支持"全选/全不选"快捷操作

### 3.3 文案生成模块

#### F5 — 多平台一键生成

- 用户点击"生成文案"按钮
- 系统根据素材内容 + 各平台设置，并行调用 LLM API 生成文案
- 每个平台独立生成，互不影响
- 展示生成进度（加载态），单个平台完成后立即展示
- 生成失败的平台展示错误原因和"重试"按钮

#### F6 — 语调/风格自定义

- 每个平台提供预设语调选项（如小红书：种草风/教程风/故事风）
- 用户可自定义输入语调描述
- 支持"使用默认语调"快速跳过

### 3.4 结果展示与操作模块

#### F7 — 文案展示卡片

- 每个平台的生成结果以卡片形式展示
- 卡片包含：平台图标、文案正文、字数统计、生成时间
- 实时高亮超出平台字数限制的部分（红色标记）
- 支持行内编辑修改生成内容

#### F8 — 一键复制

- 每张卡片右上角"复制"按钮
- 点击后复制文案正文到剪贴板
- 复制成功后按钮变为"已复制 ✓"反馈（2 秒后恢复）

#### F9 — 重新生成

- 单个平台卡片提供"重新生成"按钮
- 可调整语调后重新生成
- 保留历史版本，支持回退对比（同一平台最近 3 个版本）

### 3.5 历史记录模块

#### F10 — 会话历史

- 本地存储（localStorage）用户的历史生成会话
- 展示列表：时间、素材摘要、生成平台数
- 点击可查看历史文案详情
- 支持删除单条历史记录

---

## 4. 非功能性需求

| 维度 | 要求 |
|------|------|
| 性能 | URL 抓取 ≤ 5s；单平台文案生成 ≤ 10s |
| 安全 | API Key 加密存储，不暴露到前端 |
| 兼容性 | 支持 Chrome、Safari、Edge 最新两个主版本 |
| 响应式 | 桌面端优先，平板可浏览，移动端可用 |
| 可用性 | 无需注册即可使用（MVP 阶段） |

---

## 5. 页面结构

```
┌─────────────────────────────────────────────┐
│ Header: SocialMagic Logo + 设置(⚙API Key)  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─ 素材输入区 ──────────────────────────┐  │
│  │ [URL输入框] [📎上传文件] [📝手动输入]  │  │
│  │                                        │  │
│  │ 素材预览 / 编辑区域                    │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  ┌─ 平台选择区 ──────────────────────────┐  │
│  │ ☑ 小红书  ☑ 微信朋友圈                │  │
│  │ ☑ 抖音    ☐ 微博                      │  │
│  │           [生成文案 ✨]                │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  ┌─ 结果展示区 ──────────────────────────┐  │
│  │ ┌─小红书──┐ ┌─微信──┐ ┌─抖音──┐      │  │
│  │ │文案内容 │ │文案内容│ │文案内容│      │  │
│  │ │[复制]   │ │[复制] │ │[复制] │      │  │
│  │ └─────────┘ └───────┘ └───────┘      │  │
│  └────────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│ Footer: 历史记录入口                        │
└─────────────────────────────────────────────┘
```

---

## 6. 验收标准 (Gherkin)

### AC-1: URL 网页抓取

```gherkin
Feature: URL 网页抓取

  Scenario: 用户粘贴有效 URL 成功抓取
    Given 用户在素材输入区看到 URL 输入框
    When 用户粘贴 "https://example.com/article/123" 并点击"抓取"
    Then 系统在 5 秒内返回网页正文内容
    And 素材预览区显示抓取到的标题和正文
    And 素材源类型标记为 "url"

  Scenario: 用户粘贴无效 URL
    Given 用户在素材输入区看到 URL 输入框
    When 用户粘贴 "not-a-url" 并点击"抓取"
    Then 系统显示错误提示 "请输入有效的网页链接"
    And 素材预览区不发生变化

  Scenario: 目标网页无法访问
    Given 用户在素材输入区看到 URL 输入框
    When 用户粘贴 "https://unreachable-site.xyz" 并点击"抓取"
    Then 系统显示错误提示 "网页无法访问，请检查链接或手动粘贴内容"
    And 提供"手动输入"入口引导
```

### AC-2: 文件上传

```gherkin
Feature: 本地文件上传

  Scenario: 用户上传 PDF 文件成功
    Given 用户在素材输入区看到文件上传按钮
    When 用户选择一个 2MB 的 PDF 文件并上传
    Then 系统提取 PDF 文本内容并在素材预览区显示
    And 素材源类型标记为 "file"
    And 显示原始文件名

  Scenario: 用户上传超过 10MB 的文件
    Given 用户在素材输入区看到文件上传按钮
    When 用户选择一个 15MB 的 PDF 文件
    Then 系统显示错误提示 "文件大小不能超过 10MB"
    And 文件不被上传

  Scenario: 用户上传不支持的格式
    Given 用户在素材输入区看到文件上传按钮
    When 用户选择一个 .exe 文件
    Then 系统显示错误提示 "仅支持 PDF、Word、图片格式"
    And 文件不被上传
```

### AC-3: 多平台文案生成

```gherkin
Feature: 多平台一键生成文案

  Scenario: 用户选择多个平台成功生成
    Given 用户已输入素材内容 "新款蓝牙耳机评测..."
    And 用户勾选了 "小红书" "微信朋友圈" "抖音" 三个平台
    When 用户点击 "生成文案" 按钮
    Then 系统并行调用 LLM API 为三个平台生成文案
    And 每个平台完成后立即在对应卡片中展示文案
    And 所有平台文案在 15 秒内完成生成
    And 每张卡片显示字数统计和平台图标

  Scenario: 用户未选择任何平台
    Given 用户已输入素材内容
    And 用户未勾选任何平台
    When 用户点击 "生成文案" 按钮
    Then 系统显示提示 "请至少选择一个目标平台"
    And 不触发 AI 调用

  Scenario: 单个平台生成失败
    Given 用户已输入素材内容并勾选了多个平台
    When LLM API 为"微博"平台生成时返回错误
    Then "小红书""微信""抖音"的文案正常展示
    And "微博"卡片显示错误原因和"重试"按钮
    And 其他平台结果不受影响
```

### AC-4: 一键复制

```gherkin
Feature: 一键复制文案

  Scenario: 用户复制生成的文案
    Given "小红书"平台的文案已成功生成
    And 文案内容为 "超好用的蓝牙耳机分享！..."
    When 用户点击小红书卡片上的"复制"按钮
    Then 系统将文案正文写入系统剪贴板
    And 按钮文字变为 "已复制 ✓"
    And 2 秒后按钮文字恢复为 "复制"
```

### AC-5: 重新生成

```gherkin
Feature: 重新生成文案

  Scenario: 用户对单个平台重新生成
    Given "小红书"平台的文案已成功生成（版本 v1）
    When 用户点击小红书卡片上的"重新生成"按钮
    Then 系统重新调用 LLM API 生成小红书文案
    And 新文案（版本 v2）替换展示
    And 用户可通过版本切换查看 v1 内容

  Scenario: 用户修改语调后重新生成
    Given "抖音"平台的文案已成功生成
    When 用户将语调从 "短平快" 切换为 "搞笑幽默"
    And 点击"重新生成"
    Then 系统以 "搞笑幽默" 语调重新生成抖音文案
```

### AC-6: 历史记录

```gherkin
Feature: 历史记录

  Scenario: 用户查看历史生成记录
    Given 用户之前成功生成过 3 次文案
    When 用户点击底部"历史记录"入口
    Then 系统展示 3 条历史记录列表
    And 每条记录显示时间、素材摘要、生成平台数

  Scenario: 用户删除历史记录
    Given 用户有 3 条历史记录
    When 用户在第一条记录上点击"删除"
    Then 系统弹出确认对话框 "确定删除这条记录？"
    When 用户确认删除
    Then 该记录从列表中移除
    And 剩余 2 条历史记录
```

### AC-7: API Key 配置

```gherkin
Feature: API Key 配置

  Scenario: 用户首次使用配置 API Key
    Given 用户首次打开 SocialMagic
    When 用户点击 Header 设置图标
    Then 弹出设置面板，包含 "OpenAI API Key" 和 "Claude API Key" 输入框
    When 用户输入 OpenAI API Key 并点击"保存"
    Then API Key 加密存储到 localStorage
    And 设置面板显示 "sk-...****" 脱敏格式
    And 关闭设置面板

  Scenario: 未配置 API Key 时生成文案
    Given 用户未配置任何 API Key
    When 用户点击 "生成文案"
    Then 系统提示 "请先在设置中配置至少一个 AI 服务的 API Key"
    And 提供"前往设置"快捷链接
```

---

## 7. 技术方案摘要

| 模块 | 方案 |
|------|------|
| 前端框架 | Next.js 15 (App Router) + TypeScript |
| 样式 | Tailwind CSS |
| 图标 | Lucide React |
| URL 抓取 | Next.js Route Handler + Cheerio / @mozilla/readability |
| 文件解析 | pdf-parse (PDF)、mammoth (Word)、Tesseract.js (OCR 可选) |
| AI 调用 | Next.js Route Handler 代理，前端不暴露 Key |
| 数据存储 | MVP 阶段使用 localStorage，后续可接数据库 |
| 部署 | Vercel (推荐) 或自托管 Node.js |

---

## 8. 里程碑

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| P0 — MVP | 手动输入 + 全平台生成 + 复制 | 必须 |
| P1 — 文件支持 | PDF/Word 上传 + 解析 | 高 |
| P2 — URL 抓取 | 网页正文抓取 + 商品页解析 | 高 |
| P3 — 增强功能 | 版本历史、语调自定义、批量生成 | 中 |
| P4 — 图片 OCR | 图片文字提取 | 低 |
