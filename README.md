# Penta Gallery

League of Legends Penta Kill 截图画廊。部署在 EdgeOne Pages，图片存储于 Tencent COS，数据存储于 EdgeOne KV。

## 架构

```
Browser ─→ EdgeOne Pages ─→ Edge Functions (V8) ─→ KV (pentas:all, config:*)
           │                    │
           │                    └──→ COS (presigned upload)
           │
           └──→ Service Worker ─→ Cache API (image caching)
```

- **EdgeOne Pages**: 静态文件 + Edge Functions API
- **EdgeOne KV**: 存储 penta 数据和配置（全局变量 `KV`，不在 `context.env` 上）
- **COS**: 存储截图文件，通过 presigned URL 实现浏览器直传
- **Service Worker**: 缓存 CDN 图片，刷新不重复下载

## 目录结构

```
/
├── index.html                # 画廊首页（含筛选栏）
├── admin/index.html          # 管理后台
├── favicon.png               # 网站图标
├── css/style.css             # 样式（暗色主题、Grid 布局、筛选栏）
├── js/
│   ├── gallery.js            # 画廊前端（无限滚动、筛选、大图模式）
│   ├── admin.js              # 管理前端（CRUD、设置、排序）
│   └── cos-upload.js         # COS 浏览器直传
├── sw.js                     # Service Worker（图片缓存）
├── pentas.json               # 原始 penta 参考数据（含 map 字段，不提交 Git）
├── edge-functions/api/       # Edge Functions API
│   ├── pentas.js             # GET /api/pentas?page=&limit=&sort=&year=&champion=&map=
│   ├── pentas/stats.js       # GET /api/pentas/stats 统计 + 筛选选项
│   ├── pentas/random.js      # GET /api/pentas/random 随机一条
│   ├── pentas/[id].js        # GET /api/pentas/:id 单条
│   ├── config/turnstile.js   # GET /api/config/turnstile Turnstile 人机验证 site key
│   └── admin/
│       ├── login.js          # POST /api/admin/login 认证
│       ├── pentas.js         # POST /api/admin/pentas 创建 + 列表
│       ├── pentas/[id].js    # PUT/DELETE /api/admin/pentas/:id
│       ├── config/cos.js     # GET/PUT /api/admin/config/cos COS 配置
│       ├── config/password.js # PUT /api/admin/config/password 改密
│       └── upload-token.js   # GET /api/admin/upload-token COS presigned URL
├── scripts/
│   ├── map-screenshots.js    # 截图文件 → penta 记录映射
│   └── generate-kv-data.js   # 生成 KV 种子数据
├── screenshot/               # 本地截图文件（命名: YYYYMMDD-ChampionName.ext）
├── data/
│   └── kv-seed-output.json   # 生成的 KV 种子数据（已匹配 CDN URL + map 字段）
├── edgeone.json              # EdgeOne Pages 配置（entry: ".", edge-functions 入口）
└── package.json
```

## 部署步骤

### 1. EdgeOne Pages 创建项目

1. 登录 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. 创建项目 → 关联 Git 仓库（或手动上传）
3. 构建配置：无需构建命令，直接使用源码部署
4. **关键**：在控制台设置 `entry: "."`（项目根目录作为静态文件入口）
5. **KV 绑定**：变量名必须为 `KV`（全局变量，非 `context.env.KV`）

### 2. KV 数据

需要写入以下 KV 键：

#### a. `pentas:all` — 完整 penta 数据

从 `pentas.json` 读取并序列化为 JSON 字符串写入。数据格式：

```json
[
  {
    "id": 1,
    "champion": "LeeSin",
    "name": "李青",
    "title": "盲僧",
    "map": "嚎哭深渊",
    "date": "2024-06-15T12:00:00.000Z",
    "heroId": 64,
    "imageUrl": "https://images.eallion.com/images/penta/screenshot/20240615-Leesin.jpg"
  }
]
```

#### b. `pentas:counter` — ID 计数器

```
111
```

最后一条记录的 ID 值，新增时自动递增。

#### c. `config:admin` — 管理员配置

```json
{
  "tokenValue": "your-generated-uuid"
}
```

- `tokenValue` 是登录后返回的认证令牌
- `passwordHash` 可选，未设置时使用环境变量 `ADMIN_PASSWORD` 或默认密码 `penta`

#### d. `config:cos` — COS 配置

```json
{
  "secretId": "AKIDxxxxx",
  "secretKey": "xxxxx",
  "bucket": "my-bucket",
  "region": "ap-guangzhou",
  "pathPrefix": "penta/images",
  "cdnDomain": "cdn.example.com"
}
```

也可部署后通过 admin 后台 Settings 页面配置。

### 3. 环境变量（可选）

| 变量名 | 说明 |
|--------|------|
| `ADMIN_PASSWORD` | 管理员密码。未设置时默认使用 `penta` |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile Site Key。设置后画廊首页会启用人机验证，通过后才加载内容。API 端点不受影响。不设置则跳过验证直接显示 |

密码优先级：环境变量 > KV `config:admin.passwordHash` > 默认 `penta`

### 4. 自定义域名

在 EdgeOne Pages 控制台添加自定义域名（如 `penta.eallion.com`），按提示配置 DNS CNAME。

### 5. COS 配置

1. 在 [COS 控制台](https://console.cloud.tencent.com/cos) 创建/使用已有存储桶
2. 获取 API 密钥（SecretId + SecretKey）
3. 部署后登录 admin 后台 → Settings → COS Configuration 填写配置并保存
4. 点击 "Test Connection" 验证连通性

### 6. 上传截图

方式一（批量）：截图文件放入 `screenshot/`，运行 `node scripts/generate-kv-data.js`，将输出写入 KV `pentas:all`

方式二（单张）：登录 admin 后台 → Pentas → Add Penta 或 Edit → 选择文件上传（浏览器直传 COS）

### 7. 截图文件命名规则

| 格式 | 示例 |
|------|------|
| `YYYYMMDD-ChampionName.ext` | `20240615-Leesin.jpg` |
| `YYYYMMDD-N-ChampionName.ext` | `20240615-2-Leesin.jpg` |
| `duowan_lol_champion_YYYYMMDD_*.ext` | `duowan_lol_leesin_20240615_123456.jpg` |

Hero 头像使用腾讯官方英雄数据源：
`https://game.gtimg.cn/images/lol/act/img/champion/{ChampionName}.png`

## 功能

### 画廊首页

- **人机验证**（可选）：配置 `TURNSTILE_SITE_KEY` 后，页面加载前显示 Cloudflare Turnstile 验证，通过后才加载画廊内容
- **Grid 布局**：自适应列数（`auto-fill, minmax(280px, 1fr)`），图片强制 16:9 裁剪
- **无限滚动**：每次加载 20 条，IntersectionObserver 触底自动加载
- **筛选栏**（header 下方）：
  - **Year**：2011 至当前年份，无数据年份显示 (0)
  - **Champion**：仅显示已有截图的英雄
  - **Map**：按地图筛选（数据需有 `map` 字段）
  - **Sort**：Newest / Oldest 切换
  - **Large View**：大图模式（列数减半，2 列或 1 列）
- **图片缓存**：Service Worker 拦截图片请求，缓存复用
- **Lightbox**：点击卡片查看大图

### 管理后台

路径 `/admin/`，需密码登录。

- **Pentas 标签**：表格展示所有记录，点击列头可排序（ID/Champion/Title/Map/Date）
- **CRUD**：增删改 penta 记录，支持上传新截图
- **Settings 标签**：COS 配置管理、密码修改

## API 文档

### 公开 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/pentas` | 分页查询，支持筛选和排序 |

查询参数：

| 参数 | 说明 | 示例 |
|------|------|------|
| `limit` | 每页数量（默认 50） | `limit=20` |
| `page` | 页码（默认 1） | `page=2` |
| `sort` | 排序方向 | `asc` 或 `desc`（默认 desc） |
| `year` | 按年份筛选 | `year=2025` |
| `champion` | 按英雄筛选 | `champion=LeeSin` |
| `map` | 按地图筛选 | `map=嚎哭深渊` |

返回格式：
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 111,
    "totalPages": 6
  }
}
```

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/pentas/stats` | 统计数据 + 筛选选项（years/champions/maps） |
| GET | `/api/pentas/random` | 随机一条 |
| GET | `/api/pentas/:id` | 单条详情 |
| GET | `/api/config/turnstile` | 返回 Turnstile site key（从环境变量读取） |

### 管理 API

需要 `Authorization: Bearer {token}` 请求头。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 登录，body: `{password}`，返回 token |
| POST | `/api/admin/pentas` | 新增 penta |
| PUT | `/api/admin/pentas/:id` | 更新 penta |
| DELETE | `/api/admin/pentas/:id` | 删除 penta |
| GET | `/api/admin/config/cos` | 获取 COS 配置（secretKey 脱敏） |
| PUT | `/api/admin/config/cos` | 更新 COS 配置 |
| PUT | `/api/admin/config/password` | 修改密码 |
| GET | `/api/admin/upload-token` | 获取 COS presigned URL |

## 本地开发

```bash
npm i -g edgeone-cli
edgeone login
edgeone pages link
edgeone pages dev
```

Edge Functions 入口 `edge-functions/`，静态文件在项目根目录。
