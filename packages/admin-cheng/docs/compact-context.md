# 上下文压缩速记（compact-context）

> 本文件由「压缩」指令生成，不提交 git。用户说「继续」时先读本文件了解项目情况，再等待用户指令。

## 一、当前进度（2026-11-06 ~ 11-11 已完成并提交）

### 现场管理（活动）
1. **未签到筛选**：入选名单签到状态下拉新增「未签到」（checked_in=false），OnsiteManageModal + 单测（36144f8）
2. **分组配置保存后全链路同步**（3e6766b）：OnsiteGroupTab 新增 onSaved → 弹窗 refreshLiveActivity 重拉详情传给各 TAB；大屏 10s 轮询配置（refreshConfig + routineRawRef 去重 + routineModeRef 播放中不覆盖）
3. **各组代表性别可选**（3e6766b/8f10e8a/409d52a）：右上角性别下拉（男/女/不限/混搭）；groupRepGenderRef 仅承载编排传参（null=手动），按 P 读实时配置；filterGroupRepPools 严格过滤（无符合性别的组不出转轮）、assignGroupRepTargets 纯函数（luckyPools.utils）
4. **现场签到二维码**（94a7fcb）：现场配置 TAB「现场签到」标签旁 SourceQrcodeModal（与编辑弹窗一致，H5 中转页）
5. **未签到批量扣分 + 已完成标记**（94a7fcb/d3070e9）：未签到筛选下「扣分」按钮 → OnsiteDeductScoreModal（默认 10 分）逐条 adjustReliabilityScore(-score)；完成后写入 onsite_config.deduct_done_at（DEDUCT_DONE_KEY），按钮区显示绿色「已完成扣分」标签防重复
6. **配置过期全链路修复**（899952f）：OnsiteManageModal 打开即 refreshLiveActivity；ActivityEditModal 打开拉最新详情（prop 改名 activityProp + freshActivity 优先，保存合并防覆盖）；ActivityManagement 编辑/报名/现场弹窗关闭后 refresh 列表

### 靠谱值（用户）
- 文档确认新字段 reliability_display_score/reliability_score + 流水/调整接口 + 8 种来源枚举
- 用户资料卡片：人气+靠谱值同行、可见范围+审核状态同行、最后更新单独一行；`{展示值}（原值{系统值}）` 可点击 → ReliabilityLogModal（**不含操作人列**，用户要求去掉）
- userApi.getReliabilityLogs / adjustReliabilityScore；types/user.ts 补字段（835f7e3）

### 财务管理（3b2ba24）
- 订单管理（占位落实）/ 退款管理 / iOS退款处理（问询列表+详情）/ 提现申请（通过/拒绝）四个页面 + xpay.ts 服务 + formatCents（分→元）

### 投诉管理（6399b29）
- 互动管理最下方新增：列表（5 状态/关键词）+ 详情（消息留痕用户/商家方向、原始报文复制）+ 回复（≤2000 字）+ 完成结案；已结案/已关闭不可操作；xpay 投诉 5 接口

### 其它
- 实人认证配置页已并入「用户资料·用户认证」（默认认证记录 TAB、价格单位「元」）
- 报名名单下拉「已筛选」→「已入选」
- 接口文档已同步：虚拟支付 xpay 模块重构（59 增/15 删）+ 靠谱值 + 实人认证退款 + 报喜提现
- 测试版构建完成（dist-test/，产物待上传，0d0010d）

## 二、未完成 / 待办

1. **推送**：master 领先 origin 约 12 个提交（上次推送 eaffbe7，11-10 双版本构建时）——待用户要求推送（记忆：代理失败换直连）
2. **正式版构建**：11-10 双版本之后的新功能（靠谱值卡片/扣分标记/配置过期修复/投诉管理等）尚未进正式版
3. 测试版产物待上传服务器 /cheng 目录
4. 大屏分组轮询间隔当前 10s（如需更快可调 refreshConfig interval）

## 三、关键实现细节（易忘点）

- **活动 config 数据流**：onsite_config/extra_params 为服务端透明 JSON，前端多处原对象透传合并（bg_screen/groups/routine/deduct_done_at/onsite_qrcode）；任何入口打开弹窗必须先拉最新详情，否则旧行数据会覆盖新配置（899952f 教训）
- **各组代表性别**：groupRepGenderRef 类型 LuckyGender|null，startGroupRep 里 `override?.gender ?? null`，slowRoll 里 `groupRepGenderRef.current ?? groupRepGender`；封面阶段改性别有 useEffect 重建（与幸运之星一致）
- **扣分标记**：DEDUCT_DONE_KEY='deduct_done_at'（OnsiteDeductScoreModal 导出），写入前重拉详情防覆盖
- **分页响应**：xpay/idverify 等新接口为 data 数组 + 顶层 pagination，拦截器已转 {list,total}；页面统一用 formatResponse 兜底两种形态
- **金额**：接口存「分」，展示用 formatCents（元）；idverify/靠谱值页面价格单位按用户要求为「元」

## 四、测试环境坑（写测试时注意）

- Node 25 实验性 localStorage 遮蔽 jsdom → setupTests.ts 已打补丁（内存实现）
- rc-picker DatePicker：面板 click 打开（非 mousedown）、点日期格后需点 `.ant-picker-ok button` 提交、关闭面板不卸载（取最后一个 dropdown）
- 嵌套弹窗查询用最后一个 `.ant-modal`；antd 两字按钮文本带空格（「保 存」→ /保\s*存/ 匹配）
- jsdom 下 userEvent.click 在表单校验重渲染时极慢 → 提交按钮用 fireEvent.click
- **存量失败测试（与本轮改动无关）**：App.test.tsx（Node25 undici AbortSignal 环境问题）、Dashboard.test.tsx（旧测试未包 Router + OldSun 同步新版 Dashboard）

## 五、待用户确认

- 是否构建正式版 + 推送（见待办 1/2）
- 投诉管理是否需要「处理中(1)」状态的处理操作（当前仅前端筛选值，后端状态枚举无 1）
