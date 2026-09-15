# AI Agent 面试题库 · 地铁碎片复习版

手机端优先的交互式面试题库 Web 应用，专为地铁等碎片时间场景设计。

## 题库内容

| 题库 | 题量 | 分类 |
|---|---|---|
| 🧠 AI Agent 高频面试题 | 55 题 | 12 大模块（架构 / 规划推理 / Tool Calling / Memory / RAG / 安全 / 多 Agent / 工程化 / 框架选型 / 系统设计 / Java 转型） |
| 🍃 Spring AI Alibaba 专项 | 35 题 | 📘 基础题 15 · 📗 高级题 11 · 📕 场景题 9 |

## 功能

- 卡片式答题：先想自己的答案 → 点击揭示参考答案 → 标记「已掌握」
- ☕ Java 工程师视角：AI Agent 题目附 Java 类比迁移点（如「Agent trace = 分布式链路追踪」「Dify = Spring Boot 自动配置」）
- 难度筛选（基础 / 进阶 / 场景）、关键词搜索（题面 + 标签）、随机模式
- 收藏 + 进度追踪（总完成度环形图、各模块进度条）
- localStorage 持久化，离线（地铁无信号）也能用

## 本地运行

纯前端静态站点，无需构建，任意静态服务器指向仓库根目录即可：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 技术栈

- React 18（UMD）+ Babel Standalone（浏览器内编译 JSX）
- 题库数据：`assets/questions.json`（v2 collections 格式，含两套题库）
- 样式：`styles.css`（深色底 + 暖橙色调，地铁弱光环境友好；移动端优先，桌面自适应）

## 目录结构

```
├── index.html              # 入口页
├── app.jsx                 # 全部应用逻辑（React）
├── styles.css              # 全部样式
├── assets/questions.json   # 题库数据（90 题）
├── package.json
└── routes.json
```
