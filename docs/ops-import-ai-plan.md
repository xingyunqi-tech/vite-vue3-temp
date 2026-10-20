# 运营批量导入与 AI 智能运营实施方案

> 适用范围：运营后台 `vite-vue3-temp` 与后端 `nestjs-template`，两者均为 `release/exam-prep` 分支
>
> 已确定的前提：
>
> - 原始资料以 Word / PDF 为主
> - 模型沿用 DeepSeek
> - 拆分「编辑」与「审核员」角色

## 1. 背景与目标

### 1.1 现状

| 模块 | 能力 | 运营痛点 |
| --- | --- | --- |
| 考试与科目 | 考试 → 科目 → 知识点树（最多 3 级） | 知识点只能逐个节点弹窗创建 |
| 题目 | 7 种题型；材料题挂小题；状态 草稿 → 待审 → 发布 → 下架；发布后修改生成版本 | 逐题录入；材料题要先保存材料再逐个加小题 |
| 审核发布 | 待审列表 | 唯一的批量操作是批量发布 |
| 试卷 / 组卷规则 | 手工挑题；规则可试生成 | 规则试生成结果不能保存为试卷 |
| 批量导入 | 支持 zip / xlsx / json；按单元原子写入；同内容自动跳过；错误报告 xlsx；异步队列 | 5 个工作表靠 key 互相引用，门槛高；导入前无预检；错误只能下载 xlsx 查看；Word/PDF 需人工转成模板 |
| AI | 只有 C 端讲题；`ai:generate` 权限已登记，尚无接口使用；题目 `source` 已有 `AI_GENERATED` | 运营侧没有任何 AI 生产能力 |

### 1.2 目标

1. 现有导入保留，重点改善易用性：预检、页面内显示错误、简化模板、导出后再导入。
2. 题目列表补齐批量操作，减少逐题点击。
3. 用 AI 把 Word / PDF 整理成结构化题目。AI 只负责出初稿，所有内容必须经人工采纳和审核员发布，不允许 AI 内容直接上线。
4. 题目全程可追溯：谁生成、谁采纳、谁提交、谁审核。

### 1.3 不做

- AI 内容直接发布。
- 扫描件 OCR（第一期只支持有文字层的 PDF）。
- AI 举一反三出变式题、AI 预处理纠错单。这两项等 M3 / M4 积累准确率数据后再评估。
- 每日一练改为 AI 选题。

## 2. 分期与排期

| 阶段 | 内容 | 依赖 | 估算（人日，前后端合计） |
| --- | --- | --- | --- |
| **M0 技术验证** | 用构造样本跑通「解析 → 提取」，测出准确率 | 无 | 2–3 |
| **M1 基础** | 编辑 / 审核员角色、审计字段、题目批量操作 | 无 | 6–8 |
| **M2 导入易用性** | 预检、页面内看错误、分场景模板、导出 | 无 | 6–8 |
| **M3 AI 识别整理** | AI 生产链路、候选题工作台、Word/PDF → 草稿题 | M0、M1；M2 的预检 | 12–15 |
| **M4 AI 补标注 / 知识点树** | 批量补知识点、难度、解析；按大纲生成知识点树 | M1 的批量更新、M3 的链路 | 6–8 |

M0 和 M1 可以同时开工。M0 的结论决定 M3 的解析方案和分块参数。

**当前进度**：批次 0（M0）解析阶段已完成，构造样本上的结果见 `nestjs-template/scripts/poc/m0/`；提取阶段待配置 `LLM_API_KEY` 后实测。批次 1（角色）已完成，未提交。

## 3. M0 技术验证

**目的**：在投入 M3 之前，先确认文档解析是不是主要风险（见第 9 节 R1–R3）。

### 3.1 样本

样本由开发构造，放在后端 `scripts/poc/samples/`。题目数据只维护一份，由脚本同时生成文档和标准答案 `expected/*.json`，保证两者一致。

| 文件 | 覆盖情况 |
| --- | --- |
| `s1-xingce.docx` | 纯文字行测 / 公基；每题后紧跟【答案】【解析】；含插图、页眉页脚 |
| `s2-math.docx` | 考研数学；分式、上下标、根号、积分、求和等 Word 原生公式；答案集中在文末 |
| `s3-two-column.pdf` | 双栏排版、页眉页脚页码、题目跨栏跨页；答案集中在文末 |
| `s4-material.docx` | 资料分析材料题（含表格）+ 简答 / 申论主观题 |
| `s5-questions.docx` + `s5-answers.docx` | 题目和答案分在两个文件，答案以表格给出 |
| `s6-scanned.pdf` | 无文字层的扫描件，用于验证拒绝逻辑 |

构造样本的局限：版式噪声（错位、手工排版、混合字体、截图公式）少于真实资料。正式上线前的灰度期需要用真实资料复测，指标不达标的场景回到 M3 继续调整。

### 3.2 做法

写一次性脚本，放在后端 `scripts/poc/` 下，不进入正式代码。流程如下：

1. docx 用 `mammoth` 转 Markdown，公式另外从 OMML 转 LaTeX；pdf 用 `unpdf` 按坐标提取文字。
2. 按题号切块，调用 `deepseek-chat` 的 JSON 模式提取题目。
3. 和 `expected/*.json` 对比，算出各项指标。

**统计指标**：

| 指标 | docx 期望 | pdf 期望 |
| --- | --- | --- |
| 题目切分正确率（不漏、不并、不拆） | ≥ 98% | ≥ 95% |
| 选项完整正确率 | ≥ 98% | ≥ 95% |
| 答案匹配正确率 | ≥ 98% | ≥ 95% |
| 公式还原正确率（`s2`） | ≥ 95% | — |
| 扫描件识别（`s6`） | — | 100% 拒绝 |

**产出**：一页结论，内容包括：各指标实测值、公式转换方案、一块放多少题合适、单份文档的成本和耗时。

## 4. M1 角色、审计与批量操作

### 4.1 角色

后端：

- `src/common/enums/roles/roles.enum.ts`：新增 `editor = 3`、`reviewer = 4`。
- 迁移 + 种子数据：`role` 表插入两行；`role-seed.service.ts` 同步更新。
- `src/core/permissions/role-permissions.ts`，各角色权限如下：

| 角色 | 权限 |
| --- | --- |
| admin | 全部（保持不变） |
| editor | `content:manage`、`ai:generate`、`file:upload`、`file:read` |
| reviewer | `content:manage`、`content:review`、`file:upload`、`file:read` |

- `permissions.service.ts` 对 admin 有特判，新角色走表查询。因此迁移脚本必须同时写入角色和权限的对应关系。

前端：

- `src/constants/roles.ts`：角色只保留 `ADMIN`、`EDITOR`、`REVIEWER`（模板遗留的 `TEACHER`、`STUDENT` 移除），补全后端角色 ID 的映射，提供 `BACKOFFICE_ROLES`、`REVIEW_ROLES` 两个分组。
- `src/store/modules/user-info.ts`：登录允许 `BACKOFFICE_ROLES`；新增 `canReview`（ADMIN / REVIEWER）。
- `src/router/routes/async.ts`，各页面可见角色：

| 页面 | 可见角色 |
| --- | --- |
| 内容管理（除审核发布） | ADMIN / EDITOR / REVIEWER |
| 审核发布、纠错与勘误 | ADMIN / REVIEWER |
| AI 运营（M3） | ADMIN / EDITOR |
| AI 用量、系统、设置 | ADMIN |

- 发布和下架一律需要 `content:review`，覆盖题目、试卷、考试、科目、组卷规则，以及导入时的 `publishOnImport`。后端在对应接口上加 `@RequirePermissions(Permission.CONTENT_REVIEW)`；组卷规则通过通用更新接口改状态，所以在请求带 `status`、或规则不是草稿时校验该权限（已上线规则的内容修改同样需要审核权限）；组卷规则只能删除草稿。
- 前端的发布、驳回、下架、勘误按钮，以及「导入即发布」开关，按 `canReview` 用 `v-if` 控制显示。

### 4.2 审计字段

迁移：`question` 表新增以下字段：

- `createdBy`
- `submittedBy`、`submittedAt`
- `reviewedBy`、`reviewedAt`
- `rejectReason`

规则：

- 驳回接口改为必须填写 `reason`。
- **禁止审核自己提交的题**：发布或驳回时，如果 `submittedBy === 当前用户` 且当前用户不是 admin，返回 403。`batch-publish` 同样逐题校验，命中的题使整批返回 403 并列出题目 ID（保持其整批失败语义）。
- 题目、试卷、导入、AI 运营的写接口都加上 `@Auditable()`。

前端：

- 驳回改成弹窗，必须填原因。
- 题目编辑页和审核列表展示创建人、提交人、审核人、驳回原因。

### 4.3 题目批量操作

后端在 `admin-questions.controller.ts` 中新增：

| 接口 | 权限 | 说明 |
| --- | --- | --- |
| `POST /v1/admin/questions/batch-submit` | `content:manage` | 草稿 → 待审 |
| `POST /v1/admin/questions/batch-reject` | `content:review` | 带 `reason` |
| `POST /v1/admin/questions/batch-offline` | `content:review` | 发布 → 下架 |
| `POST /v1/admin/questions/batch-delete` | `content:manage` | 只能删从未发布的草稿 |
| `PATCH /v1/admin/questions/batch-update` | `content:manage` | 知识点（追加 / 覆盖）、难度、来源、是否免费 |

统一约定：

- 请求体为 `{ ids: uuid[] }`，1–100 条，不能重复。传入小题时按所属材料整组处理。
- **逐题独立执行**，返回 `{ succeeded: number, failed: { id, reason }[] }`。不采用现有 `batch-publish` 的整批失败语义，`batch-publish` 本身不改。
- `batch-update` 修改已发布题目时，沿用现有逻辑生成 EDIT 版本。

前端（`content/questions`）：

- 列表加勾选列和批量操作栏；批量设知识点复用 `KnowledgePointSelect`。
- 执行完弹出结果，逐条列出失败原因。

### 4.4 验收

- editor 能建题、提交审核，但看不到发布 / 驳回入口；直接调用这些接口返回 403。
- reviewer 发布自己提交的题返回 403。
- 选中 50 道题批量提交审核，其中 3 道状态不符：47 道成功，3 道列出原因。

## 5. M2 导入易用性

### 5.1 导入前预检

后端：

- `CreateImportDto` 增加 `dryRun?: boolean`。
- `ImportSession` 增加 `dryRun` 选项。开启后：
  - `writeUnit` 和 `uploadAssets` 只做校验，不写库；
  - 知识点路径和本次导入内新建题目的 key 引用都在内存里模拟。
- `dryRun` 同步返回 `{ wouldCreate, wouldUpdate, wouldSkip, errors: ImportRowError[] }`，不创建导入任务。超过 2000 个单元时返回 413，提示直接导入后看错误报告。
- 新增 `GET /v1/admin/imports/:id/errors.json`，供页面直接展示错误。

前端（`content/imports`）：

- 改为三步：上传 → 查看预检结果 → 确认导入。
- 错误用表格展示，可按工作表 / 字段筛选。历史任务可以展开看错误明细。
- 页面注明「预检结果仅供参考，以实际导入为准」。

### 5.2 模板

后端：

- 选项列上限从 A–H 扩到 A–Z：改 `import-session.ts` 中的上限常量和 `sheet-row` 的列定义。
- 兼容只填一列 `options` 的写法，每行一个 `A. xxx`。

前端（`public/templates/`）：模板拆成 4 份。

| 模板 | 内容 |
| --- | --- |
| 客观题 | 只有 `questions` 一个工作表，不需要 key |
| 主观题 | 含简答、作文样例 |
| 材料题 | `materials` + `questions` |
| 完整 | 现有 5 个工作表 |

### 5.3 导出

后端：

- 新增 `POST /v1/admin/exports`，参数沿用题目列表的筛选条件。
- 导出在队列中异步执行，生成和导入同格式的 xlsx，每行带 `id`。文件用途用已有的 `export`。

前端：

- 题目列表加「导出」按钮。
- 导入和导出任务合并展示为「任务中心」。

运营可以「导出 → 在 Excel 里修改 → 再导入」来批量改题。按 `id` 更新的导入能力已经有了。

### 5.4 验收

- 上传一份含 5 处错误的 xlsx：预检页面列出全部 5 处；修正后预检通过，导入结果和预检预估一致。
- 导出 200 道题，原样再导入：全部计为跳过或更新，没有新建。

## 6. M3 AI 识别整理（Word / PDF → 题目）

### 6.1 数据流

```text
上传 docx/pdf（可选：再上传一份答案文件）   文件用途 ai-source
  │
  ▼ 创建 AI 任务，进入队列 ai-generation
① 解析：文字带位置；图片单独存储并替换为 assets 占位符；公式按 M0 定下的方案转 LaTeX
② 切块：按题号 / 章节切块，块的大小以 M0 结论为准（预估每块 15–20 题）
③ 提取：每块调用 deepseek-chat 的 JSON 模式；输出被截断时把块对半切开重试一次
④ 合并答案：识别文末「参考答案」区或独立答案文件，按题号合并
⑤ 校验：用 M2 预检的同一套规则逐条校验，结果写入候选题的 checks
⑥ 答案复核（可选，仅客观题）：deepseek-reasoner 不看答案独立作答，结果不一致的标出
⑦ 去重：按内容哈希比对题库和本批次，命中的标「重复」
  │
  ▼ 任务状态变为 READY
候选题工作台：人工修改 / 采纳 / 丢弃
  │ 采纳
  ▼
采纳的候选题拼成 content.json，连同图片打成 zip，作为文件用途 import 保存
  → 创建导入任务：不直接发布，source 固定为 AI_GENERATED，sourceNote 写 AI 任务 ID
  │
  ▼
题目进入草稿 → 编辑批量提交审核 → 审核员发布
```

### 6.2 后端

#### 模型调用

在 `src/integrations/llm/llm-provider.ts` 中新增：

```ts
abstract completeJson(params: {
  system: string;
  messages: LlmChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<{ json: unknown; usage: LlmUsageChunk; finishReason: LlmFinishReason }>;
```

- 在 `openai-compatible-llm.provider.ts` 中实现：非流式，`response_format: { type: 'json_object' }`。
- `finishReason === 'length'` 时抛出 `LlmError('truncated')`（新增错误码），JSON 解析失败时抛出 `LlmError('invalidResponse')`，调用方据此只对截断做切块重试。
- 答案复核只需要模型返回很短的答案，用纯文本解析，不依赖 reasoner 是否支持 JSON 模式。
- `llm.config.ts` 新增两个环境变量：
  - `LLM_GENERATION_MODEL`，默认 `deepseek-chat`
  - `LLM_VERIFY_MODEL`，默认 `deepseek-reasoner`

#### 文档解析（`src/modules/ai-studio/source/`）

| 格式 | 方案 |
| --- | --- |
| docx | `mammoth` 转 Markdown；图片存入文件服务并替换为 `![](assets/imgN.png)`；公式按 M0 方案直接把 OMML 转为 LaTeX（`scripts/poc/m0/src/omml.mjs`） |
| pdf | `unpdf` 按坐标排序提取文字，处理双栏、页眉页脚；不提取图片，题干中出现「如图」等字样的标为缺图 |
| 扫描件 | 每页文字少于 50 字时判定为扫描件，拒绝并提示不支持 |

- 文件用途新增 `ai-source`：docx / pdf / txt，单个文件不超过 20MB。

#### 新模块 `src/modules/ai-studio/`

表结构：

```text
ai_generation_task
  id, scenario (EXTRACT | TAG | KNOWLEDGE_TREE), subjectId,
  sourceFileId, answerFileId?, params jsonb,
  status (PENDING | PARSING | GENERATING | READY | FAILED | CANCELLED),
  progress, promptVersion, model,
  inputTokens, outputTokens, cachedInputTokens, cost,
  failureReason, createdBy, createdAt, finishedAt

ai_candidate
  id, taskId, seq,
  kind (MATERIAL | QUESTION | KNOWLEDGE_POINT | ANNOTATION),
  payload jsonb        -- 与导入 json 的一行同构
  sourceExcerpt text   -- 原文片段，供工作台对照
  checks jsonb         -- { schemaErrors[], answerCheck: MATCH|MISMATCH|SKIPPED, duplicateOfId?, needsReview[] }
  status (PENDING | ACCEPTED | DISCARDED | IMPORTED),
  importJobId, updatedBy, updatedAt
```

`needsReview` 记录需要人工核对的项：公式、缺图、题号不连续等。

接口统一要求 `ai:generate` 权限：

| 接口 | 说明 |
| --- | --- |
| `POST /v1/admin/ai-studio/tasks` | 参数：`scenario`、`subjectId`、`fileId`、`answerFileId?`、`verifyAnswers` |
| `GET /v1/admin/ai-studio/tasks` / `GET /v1/admin/ai-studio/tasks/:id` | 任务列表 / 详情（含进度、成本） |
| `POST /v1/admin/ai-studio/tasks/:id/cancel` | 取消 |
| `GET /v1/admin/ai-studio/tasks/:id/candidates` | 分页，可按 `status`、`checks` 筛选 |
| `PATCH /v1/admin/ai-studio/candidates/:id` | 修改候选题，保存后重新校验 |
| `POST /v1/admin/ai-studio/tasks/:id/accept` | `{ candidateIds }`，生成导入任务；校验未通过的拒绝采纳 |
| `POST /v1/admin/ai-studio/tasks/:id/discard` | `{ candidateIds }` |

执行与限额：

- 执行方式照搬 `import-launcher`：有 Redis 时走 BullMQ，没有时在进程内执行。并发为 2。
- 超时检测：PARSING 或 GENERATING 超过 60 分钟的任务置为 FAILED。
- AI 用量统计的 `kind` 增加 `'generation'`。`AiBudgetService` 按 kind 分别统计预算。
- 新增远程配置：

| key | 说明 | 默认值 |
| --- | --- | --- |
| `ai.generation.enabled` | 运营 AI 总开关（灰度用） | false |
| `ai.generation.dailyBudget` | 运营侧每日预算（元） | 50 |
| `ai.generation.maxPagesPerTask` | 单个任务最大页数 | 50 |

- 不复用 C 端的 `AiAccessService`，那里的绑定手机、同意 AI 声明等前置条件不适用于运营。

Prompt：

- 放在 `ai-studio/domain/prompts/` 下，每个场景一个文件，导出 `PROMPT_VERSION`，任务记录里保存版本号。
- 原文包裹在 `<document>` 标签中。
- 约束模型：只做结构化，不改写题干；原文没有的答案留空，不得编造；占位符原样保留。

### 6.3 前端

- 路由新增「AI 运营」菜单，EDITOR / ADMIN 可见：
  - `/ai/studio`：任务列表。可上传题目文件和可选的答案文件、选科目、勾选「答案复核」；展示状态、进度、成本；运行中的任务每 3 秒轮询。上传入口提示「优先上传 Word」。
  - `/ai/studio/:id`：候选题工作台。
- 候选题工作台：
  - 左侧显示原文片段，右侧是结构化表单，复用 `QuestionFields`、`OptionsEditor`。
  - 顶部按标签筛选：全部 / 校验失败 / 答案不一致 / 需核对 / 重复 / 已采纳。
  - 支持批量采纳、批量丢弃。校验失败的候选题不能采纳，并显示原因。
  - 答案不一致的提示文案写「答案不一致，请核对」，不写「答案错误」。
- 接口在后端完成后用 `pnpm orval` 生成，不手写。
- `ai/usage/usage-stats.ts` 增加 `generation` 类型的标签「AI 生产」。

### 6.4 验收

- 用 M0 的样本跑完整流程，题目切分、选项、答案的准确率不低于 M0 的实测值。
- 采纳的题目全部进入草稿，`source = AI_GENERATED`，`sourceNote` 能追溯到 AI 任务。
- 任务没法让题目直接变成已发布：接口不提供该参数，生成的导入任务 `publishOnImport` 固定为 false。
- 当日成本超过 `ai.generation.dailyBudget` 时，新任务被拒绝，并触发告警。

## 7. M4 AI 补标注与知识点树

### 7.1 补标注

- 入口：在题目列表勾选题目，点「AI 补标注」，创建 `TAG` 任务。入口只对有 `ai:generate` 的角色（ADMIN / EDITOR）显示。
- 每道题生成三项建议：
  - 知识点：prompt 中只提供该科目的叶子知识点候选；返回的 ID 不在候选里就丢弃。
  - 难度：1–5。
  - 解析：只在原题没有解析时生成。
- 在工作台逐条确认，然后调用 M1 的 `batch-update` 写回。
- 默认只处理草稿和待审中的题。处理已发布题目需要手动勾选，因为每道题都会生成一个 EDIT 版本。

### 7.2 知识点树

- 上传或粘贴大纲，创建 `KNOWLEDGE_TREE` 任务，生成三级树。
- 工作台以树形展示，可以编辑。确认后走 `knowledge_points` 工作表导入；已存在的路径会自动跳过。

## 8. 测试与上线

- 后端：
  - 每个新 service 写单元测试。
  - `completeJson` 需要覆盖：输出截断、JSON 无效、超时。
  - `ai-studio` 写 e2e 测试，用 mock 的 LlmProvider 走完「上传 → 候选题 → 采纳 → 草稿」。
- 前端：
  - 批量操作结果展示、预检三步流程、工作台筛选与采纳要有组件测试，放在 `tests/views/` 下与源码镜像。
- 上线：
  - M1 / M2 直接上线。
  - M3 先打开 `ai.generation.enabled`，只给 1–2 名编辑试用两周。收集采纳率、修改率、复核不一致率，再全员开放。

## 9. 风险与对策

| # | 级别 | 风险 | 对策 |
| --- | --- | --- | --- |
| R1 | 高 | Word 公式（OMML）会被 `mammoth` 丢掉；DeepSeek 不能识图 | 公式科目已纳入第一期：解析阶段自行把 OMML 转为 LaTeX，M0 验证转换效果；转换失败的公式保留占位，所在题目标为「需核对」 |
| R2 | 高 | PDF 双栏、页眉页脚、跨页导致文字顺序错乱 | 按坐标排序；工作台对照原文；选项数异常检测；答案复核。提示优先上传 Word |
| R3 | 高 | 答案在文末集中给出或放在另一个文件 | 单独一轮识别答案区；支持上传独立答案文件 |
| R4 | 中 | 模型单次输出上限约 8K token，输出可能被截断 | 控制每块大小；被截断时对半切开重试 |
| R5 | 中 | PDF 图片难以和题目对应 | 第一期不提取 PDF 图片，标为缺图，人工补 |
| R6 | 中 | 预检与实际导入结果可能不一致（并发、单元之间的依赖） | 页面注明以实际导入为准；实际导入仍生成错误报告 |
| R7 | 中 | 内容哈希只能识别完全相同的题，近似重复识别不了 | 第一期接受。后续用全文检索给出「疑似重复」提示 |
| R8 | 中 | 真题、教辅原文发给第三方模型，有版权风险 | 业务确认资料来源已获授权，见第 10 节 |
| R9 | 低 | 导入队列并发为 1，AI 采纳生成的导入任务要和大批量导入排队 | 可以接受；出现瓶颈再按来源拆分队列 |
| R10 | 低 | 批量修改已发布题目会生成大量版本 | M4 默认只处理草稿和待审 |
| R11 | 低 | 答案复核本身也可能出错，而且 reasoner 慢 | 复核为可选项，只用于客观题，文案中性 |
| R12 | 低 | 成本：100 道题提取约 0.15 元，加复核约 1 元以内 | 成本不是瓶颈；仍设置运营专用预算和页数上限 |

## 10. 已决策事项

| # | 事项 | 结论 |
| --- | --- | --- |
| 1 | 「不能审核自己提交的题」是否对 admin 豁免 | 豁免，admin 可以审核自己提交的题 |
| 2 | 资料来源的版权、授权 | 已确认 |
| 3 | 公式密集的科目（考研数学、计算机）是否纳入第一期 | 纳入，公式还原是 M3 的必做项 |
| 4 | M0 样本 | 由开发构造，见 3.1 节 |

## 11. 分批实施

每一批都可以单独评审、单独上线。后端先行，接口出来后前端用 `pnpm orval` 生成接口再开发。

| 批次 | 阶段 | 内容 | 仓库 | 依赖 | 估算（人日） |
| --- | --- | --- | --- | --- | --- |
| 0 | M0 | 构造样本 + 验证脚本 + 结论 | 后端 `scripts/poc/` | 无 | 2–3 |
| 1 | M1 | editor / reviewer 角色、权限、菜单可见范围、登录放开 | 前端 + 后端 | 无 | 2–3 |
| 2 | M1 | 审计字段、驳回原因、禁止自审（admin 豁免）、`@Auditable()` | 前端 + 后端 | 批次 1 | 2 |
| 3 | M1 | 题目批量提交 / 驳回 / 下架 / 删除 / 更新 | 前端 + 后端 | 批次 2 | 2–3 |
| 4 | M2 | 导入预检、页面内错误明细、选项扩到 A–Z | 前端 + 后端 | 无 | 3–4 |
| 5 | M2 | 分场景模板、导出、任务中心 | 前端 + 后端 | 批次 4 | 3–4 |
| 6 | M3 | `completeJson`、`ai-studio` 表与队列、`generation` 计费、开关与预算 | 后端 | 批次 0、2 | 4–5 |
| 7 | M3 | Word / PDF 解析（含公式）、提取、合并答案、复核、去重、采纳转导入 | 后端 | 批次 6、4 | 4–5 |
| 8 | M3 | AI 运营任务列表、候选题工作台、用量页 `generation` 标签 | 前端 | 批次 7 | 4–5 |
| 9 | M4 | AI 补标注、AI 知识点树 | 前端 + 后端 | 批次 3、8 | 6–8 |

上线节奏：

- 批次 1–5 做完一批上线一批。
- 批次 6–8 一起上线，先灰度两周。
- 批次 9 看灰度数据再决定。

两条线可以并行推进：

- 批次 0 与批次 1 → 2 → 3。
- 批次 4 → 5 可以穿插在中间。
