# Liuhe Atlas：特别号推荐器重构规格

## 1. 产品目标

将现有项目重构成一个简单、单一用途的应用：

> 只分析每期开奖的第 7 个号码（特别号），并根据历史数据模型，为下一期推荐概率评分最高的 N 个候选号码。

用户可以选择 `1–40` 中的任意整数。例如选择 `20`，系统返回模型排名最高的 20 个特别号候选。

这里展示的是**模型估计分数/估计概率**，不是官方真实概率，也不能保证中奖。在公平且独立的开奖中，每个号码成为特别号的理论边际概率仍是 `1/49 ≈ 2.04%`。

## 2. MVP 范围

### 必须实现

- 自动抓取每一期的 7 个开奖号码。
- 数据库保留完整 7 个号码，但推荐模型只读取 `position = 7`。
- 用户通过滑块或数字输入选择推荐数量 `N`，范围为 `1–40`。
- 后端计算 1–49 的完整排名，API 返回前 N 个号码。
- 每个推荐项显示：号码、排名、模型分数、历史出现次数、距上次出现的期数。
- 显示最新一期、最新特别号、数据更新时间和有效样本量。
- 提供滚动样本外回测，并与随机 Top-N 基线 `N/49` 比较。
- 明确显示风险说明和模型限制。

### 不做

- 不预测前 6 个普通号码。
- 不提供手动选号、组合投注、赔率、收益或盈利承诺。
- 不使用生肖、五行、波色作为 MVP 模型特征。
- 不在浏览器中训练或计算最终推荐。
- 不把“刚出现过”直接等同于“下一期概率更低”。
- 不使用 AI/LLM 生成彩票号码。

## 3. 推荐的系统架构

```mermaid
flowchart LR
    A["开奖数据源"] --> B["抓取与校验任务"]
    B --> C["SQLite / Postgres"]
    C --> D["评分与回测服务"]
    D --> E["REST API"]
    E --> F["React 前端"]
```

推荐技术栈：

- Backend：Python 3.12、FastAPI、SQLAlchemy 2、Pydantic 2、Alembic。
- MVP 数据库：SQLite；部署到多实例或需要并发写入时改用 Postgres。
- Frontend：React、TypeScript、Vite、Tailwind。
- Tests：Pytest、Vitest、React Testing Library。

## 4. 后端重构

### 4.1 建议目录

```text
backend/
  app/
    main.py
    config.py
    db.py
    models.py
    schemas.py
    api/
      health.py
      draws.py
      recommendations.py
      backtests.py
    services/
      fetcher.py
      validator.py
      scoring.py
      backtest.py
    repositories/
      draws.py
  migrations/
  tests/
  pyproject.toml
```

删除或归档旧的实验性 spider、synthetic backfill 和不再使用的生肖派生流程，只保留一个生产抓取入口和一个历史回填入口。

### 4.2 数据模型

`draws`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `lottery_type` | smallint | 非空 |
| `period_id` | bigint | 非空 |
| `draw_date` | date | 非空 |
| `source_url` | text | 非空 |
| `fetched_at` | datetime | 非空 |

主键必须是：

```sql
PRIMARY KEY (lottery_type, period_id)
```

`draw_numbers`：

| 字段 | 类型 | 约束 |
|---|---|---|
| `lottery_type` | smallint | 外键 |
| `period_id` | bigint | 外键 |
| `position` | smallint | `1 <= position <= 7` |
| `ball` | smallint | `1 <= ball <= 49` |

主键：`(lottery_type, period_id, position)`；同一期内 `ball` 必须唯一。只有恰好包含 7 个有效且不重复号码的一期数据，才能标记为可用于模型。

### 4.3 数据抓取和校验

抓取流程必须：

1. 请求主数据源；失败时使用明确配置的备用源。
2. 开启 TLS 证书验证，不允许全局 `verify=False`。
3. 解析期号、日期和按顺序排列的 7 个号码。
4. 验证号码数量为 7、范围为 1–49、同一期没有重复号码。
5. 使用幂等 upsert，但不得让不同 `lottery_type` 相互覆盖。
6. 保存来源 URL、抓取时间和校验状态。
7. 记录结构化日志；连续失败时任务返回非零退出码。

### 4.4 MVP 评分模型

第一版使用可解释、保守的特别号历史频率模型，不使用“遗漏越久越该出现”或“刚出现就必然降权”。

只取按时间排序的历史特别号：

```text
y_t = ball where position = 7
```

对号码 `i` 使用 Dirichlet/Laplace 平滑：

```text
p_i = (count_i + alpha) / (sample_count + 49 * alpha)
```

MVP 固定 `alpha = 1`。49 个 `p_i` 之和必须为 1。按以下顺序排序：

1. `probability` 降序；
2. `count` 降序；
3. `ball` 升序，确保结果稳定。

必须把字段命名为 `estimated_probability`，前端显示为“模型估计”，不能称作“真实中奖概率”。

如果有效样本少于 100 期，API 仍可返回结果，但必须返回：

```json
{
  "data_quality": "insufficient_history",
  "warning": "历史样本不足，排名主要反映抽样噪声"
}
```

### 4.5 “上期号码降权”规则

默认关闭。不能因为上期特别号为 20，就人为降低下一期 20 的评分。

后端应保留一个研究统计：连续两期特别号相同的历史比例、Wilson 95% 置信区间，以及公平独立基线 `1/49`。只有未来在足够样本和样本外测试中证明规则稳定有效，才允许通过版本化模型启用；禁止做成用户可随意打开的“玄学”开关。

### 4.6 API

#### `GET /api/v1/recommendations?count=20`

- `count` 必须是整数，范围 `1–40`；否则返回 HTTP 422。
- 后端始终计算完整 49 个排名，再截取前 N 个。

示例响应：

```json
{
  "target": "next_special_number",
  "requested_count": 20,
  "model": {
    "name": "dirichlet_frequency",
    "version": "1.0.0",
    "alpha": 1
  },
  "latest_draw": {
    "period_id": 2026223,
    "draw_date": "2026-08-11",
    "special_number": 20
  },
  "sample_count": 500,
  "data_quality": "ok",
  "recommendations": [
    {
      "rank": 1,
      "ball": 8,
      "estimated_probability": 0.026,
      "historical_count": 13,
      "gap_draws": 4
    }
  ],
  "generated_at": "2026-08-12T12:00:00Z",
  "disclaimer": "模型估计不代表真实中奖概率或中奖保证。"
}
```

其他端点：

- `GET /api/v1/draws/latest`
- `GET /api/v1/draws?limit=50&offset=0`
- `GET /api/v1/backtests/latest`
- `GET /api/v1/health`

API 响应不应依赖前端自行读取 SQLite 或静态 `snapshot.json`。

### 4.7 回测要求

使用 walk-forward 回测：预测第 t 期时只能使用第 t 期之前的数据。对每个 `N = 1–40` 至少输出：

- 测试期数；
- Top-N 命中次数与命中率；
- 随机基线 `N/49`；
- 命中率 95% 置信区间；
- 相对基线的差值；
- Brier score 或 multiclass log loss。

不得只展示训练内频率。模型没有稳定超过基线时，API 和 UI 都应明确显示“未发现可靠预测优势”。

## 5. 前端重构

### 5.1 页面只保留四个区域

1. **Header**：产品名、最新期号、更新时间。
2. **推荐数量选择器**：滑块 + 数字输入，范围 1–40，默认 20。
3. **推荐结果**：按排名显示 N 个号码。
4. **模型说明**：样本量、回测结果、免责声明。

删除旧的普通号码选择器、Top-N/Cover-N 策略切换、生肖/五行/波色图表、投注收益、组合覆盖和复杂报告导出。

### 5.2 用户流程

```text
打开页面
→ 默认请求 /api/v1/recommendations?count=20
→ 用户把数量改为 1–40
→ 300ms debounce 后重新请求 API
→ 显示前 N 个推荐号码及模型信息
```

### 5.3 推荐结果组件

每个号码卡片只显示：

- 大号数字；
- 排名；
- 模型估计百分比；
- 历史次数；
- 遗漏期数。

提供一个“复制推荐号码”按钮。复制结果按排名排列，不要自动按数字大小重排。

### 5.4 前端状态

必须处理：

- 首次加载 skeleton；
- API 失败和重试；
- 输入超出 1–40 时的即时校验；
- 样本不足 warning；
- API 返回少于请求数量时的异常状态；
- 空数据状态；
- 移动端 1–2 列、桌面端 5–10 列响应式布局。

不要在前端重新实现评分公式；推荐结果必须完全以 API 为准。

## 6. 测试与验收标准

### Backend

- `position != 7` 的号码不会改变推荐排名。
- 49 个完整估计概率之和误差小于 `1e-12`。
- `count=1` 和 `count=40` 返回正确数量；0、41、小数、字符串返回 422。
- 同样的数据输入始终得到同样的排序。
- 不同彩种的相同期号不会相互覆盖。
- 无效、缺号或重复号的一期不会进入模型。
- walk-forward 回测没有读取未来期数据。
- 数据源超时、结构变化和数据库错误都有测试。

### Frontend

- 首次进入默认显示 20 个号码。
- 用户可选择任意 1–40，而不是固定的 5/10/15/20。
- 修改数量后只展示 API 返回的前 N 项。
- 加载、错误、空数据和样本不足状态均有组件测试。
- 375px 宽度下无横向溢出。
- TypeScript、lint、unit tests 和 production build 全部通过。

### 产品验收

- 页面中没有任何前 6 个号码的预测或推荐。
- 页面中没有“保证”“稳赚”“准确预测”等误导性描述。
- 所有推荐均可追溯到模型版本、数据截止期和样本数。
- 推荐接口 P95 响应时间在本地缓存命中时低于 200ms。

## 7. 实施顺序

1. 修复数据库复合主键并编写迁移。
2. 合并和清理抓取器，回填尽可能多的真实历史数据。
3. 建立 FastAPI、repository、评分服务与 API tests。
4. 实现 walk-forward 回测和随机基线比较。
5. 将 React 页面重写为四区单页，并接入 API。
6. 删除未使用的旧组件、依赖和静态快照计算代码。
7. 建立 CI：backend tests + frontend lint/test/build。
8. 配置定时抓取、健康检查和失败告警。

## 8. 给 Claude Code 的执行指令

请在现有 `liuhe-atlas` 仓库中按本规格执行重构。开始编码前先输出：

1. 当前代码与本规格的 gap analysis；
2. 将保留、迁移、删除的文件清单；
3. 数据库迁移和回滚方案；
4. 分阶段实施计划。

随后逐阶段实现。每完成一个阶段，运行对应测试并报告真实结果。不要覆盖仓库中尚未提交的用户修改；发现冲突时先停止并说明。不要凭空制造历史数据，不要用 synthetic 数据训练或展示生产推荐，不要在没有样本外证据时加入“上期号码降权”。

