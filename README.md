# NAS Tool Station (Monolith)
这是一个基于 Next.js 14+ (App Router) 构建的个人 NAS 工具站，采用单体仓库（Monolith）架构，旨在方便地集成各种独立的小工具。

## 技术栈
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI 组件**: shadcn/ui
- **数据库/数据源**: 
  - **Prisma + SQLite**: 仪表盘首页及未来新工具的默认存储。
  - **Feishu Bitable**: `9Map` 相关工具的核心数据源。
- **部署**: Docker (支持 standalone 模式)

## 项目架构

项目采用模块化单体架构，所有工具均位于 `app/` 目录下：

```text
.
├── app/
│   ├── page.tsx            # 首页仪表盘 (Dashboard)
│   ├── layout.tsx          # 全局布局 (根 Layout)
│   ├── 9map/               # [工具名] 目录
│   ├── feishu_push/        # [工具名] 目录
│   ├── assets/             # [工具名] 目录
│   │   ├── page.tsx        # 工具入口
│   │   ├── layout.tsx      # 工具专属布局
│   │   ├── components/     # 工具私有组件
│   │   └── lib/            # 工具私有逻辑
│   └── [tool-name]/        # 后续新增工具的目录
├── components/
│   └── ui/                 # 共享的 shadcn/ui 组件
├── lib/                    # 全局共享库
├── prisma/
│   └── schema.prisma       # 数据库模型定义
├── dev.db                  # SQLite 数据库文件 (开发/生产通用)
├── Dockerfile              # 多阶段构建生产镜像
└── docker-compose.yml      # Docker 编排配置
```

## 数据源说明

本项目采用双数据源策略，以满足不同场景需求：

1. **飞书多维表格 (Feishu Bitable)**:
   - **适用工具**: `9Map Gallery`, `9Map Helper`。
   - **配置**: 需在根目录 `.env` 中配置 `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `FEISHU_APP_TOKEN`, `FEISHU_TABLE_ID`。
   - **优势**: 方便在移动端（飞书 App）随时查看和手动编辑数据。

2. **本地 SQLite (Prisma)**:
   - **适用工具**: 仪表盘首页、`Assets` 资产管理等新工具。
   - **配置**: 数据库文件位于根目录 `dev.db`。
   - **优势**: 低延迟、离线可用、适合高度自定义的功能。

## 环境变量规范

在 `.env` 文件中添加新变量时，请务必遵守以下规范，以便于维护和 Agent 理解：

1. **分组注释**: 检查是否有对应工具的注释区块。若无，请添加 `# === [工具名] ===` 标题进行分隔。
2. **命名前缀**: 变量名必须**全大写**，且加上**工具英文名称**作为前缀。
   - *错误示例*: `API_KEY`
   - *正确示例*: `EXCHANGE_API_KEY` (汇率工具)
3. **安全准则**: 除非明确需要在前端代码中使用，否则**不要**添加 `NEXT_PUBLIC_` 前缀。确保敏感密钥仅在服务端（Server Actions/API Routes）可用。

## 开发指南

### 增加新工具

1. **创建目录**: 在 `app/` 下新建工具目录，例如 `app/my-tool/`。
2. **定义入口**: 创建 `app/my-tool/page.tsx`。
3. **嵌套布局**: 如有需要，创建 `app/my-tool/layout.tsx`。
4. **注册到仪表盘**: 在 `app/page.tsx` 的 `tools` 数组中添加该工具的信息：
   ```typescript
   {
     name: "我的工具",
     description: "工具描述",
     icon: MyIcon,
     href: "/my-tool",
     color: "text-purple-500",
   }
   ```
5. **别名引用**: 使用 `@/` 或 `@/[tool-name]/` 别名进行引用。已在 `tsconfig.json` 中配置：
   - `@/*`: 项目根目录
   - `@/9map/*`: `app/9map/` 目录
   - `@/feishu_push/*`: `app/feishu_push/` 目录

### 数据库操作

项目使用 Prisma 管理 SQLite：
- **修改模型**: 编辑 `prisma/schema.prisma`。
- **生成客户端**: `npx prisma generate`。
- **同步/迁移**: 使用 `npx prisma db push` 或 `npx prisma migrate dev`。

## 部署

### 本地运行

```bash
npm install
npm run dev
```

### Docker 部署 (推荐)

项目已针对 Docker 优化，支持 `standalone` 输出。

```bash
docker-compose up --build -d
```

**注意事项**:
- `dev.db` 会被自动挂载到容器中，确保数据持久化。
- 环境变量请通过 `.env` 文件或 `docker-compose.yml` 注入。

## Agent 协作准则

- **模块隔离**: 尽量将工具特有的逻辑保持在 `app/[tool-name]/` 内部。
- **共享 UI**: 优先使用 `components/ui/` 下的共享组件，如需新增全局组件请放入该目录。
- **别名使用**: 务必使用 `tsconfig.json` 中定义的 path aliases 避免深层相对路径。
- **Prisma V7**: 注意 Prisma 7.2+ 的配置要求，保持 `prisma.config.ts` 与 `schema.prisma` 的同步。
