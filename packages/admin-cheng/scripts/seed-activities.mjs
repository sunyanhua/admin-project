/**
 * 活动种子数据脚本（可重复执行：先清理同名种子活动，再重建）
 *
 * 依据 DEMO（D:\GitHub\DEMO\他俩能成）中的演示活动数据，通过管理后台 API
 * 批量创建活动，覆盖：
 *   - 三种报名方式：免费先到先得(0) / 收费先交费先得(1) / 免费审核筛选(2)
 *   - 性别区分报名限额（有/无）
 *   - 各种 form_config（单选、多行文本）
 *   - 各专区：朝阳相伴 / 青爱团 / 无专区
 *   - 活动阶段：已结束 / 报名中 / 未开始（日期相对今天动态计算）
 *
 * 用法：
 *   node scripts/seed-activities.mjs <用户名> <密码>
 *   BASE_URL=https://tlnc-test.vbegin.com.cn node scripts/seed-activities.mjs ...
 */

const BASE_URL = (process.env.BASE_URL || 'https://tlnc-test.vbegin.com.cn').replace(/\/+$/, '');
const USERNAME = process.env.ADMIN_USERNAME || process.argv[2];
const PASSWORD = process.env.ADMIN_PASSWORD || process.argv[3];

if (!USERNAME || !PASSWORD) {
  console.error('缺少登录凭据。用法：node scripts/seed-activities.mjs <用户名> <密码>');
  process.exit(1);
}

// 生成表单字段 ID
let fieldSeq = 0;
const fieldId = () => `f_${Date.now().toString(36)}_${fieldSeq++}`;

// 北京时区日期（UTC+8），相对今天偏移天数
const beijing = (offsetDays, timeStr = '00:00') => {
  const now = new Date(Date.now() + 8 * 3600 * 1000); // 转北京时间的 UTC 表示
  const d = new Date(now.getTime() + offsetDays * 86400 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${timeStr}:00+08:00`;
};

/**
 * 按阶段生成时间：
 *  - ended:       活动已结束（过去）
 *  - registering: 报名中（register_start 已过，register_end 未到，活动在未来）
 *  - upcoming:    未开始（报名尚未开启，活动在未来）
 */
function phaseTimes(phase) {
  if (phase === 'ended') {
    return {
      start_time: beijing(-14, '14:00'),
      end_time: beijing(-14, '17:00'),
      register_start: beijing(-20),
      register_end: beijing(-16, '23:59'),
    };
  }
  if (phase === 'registering') {
    return {
      start_time: beijing(8, '14:00'),
      end_time: beijing(8, '17:00'),
      register_start: beijing(-3),
      register_end: beijing(5, '23:59'),
    };
  }
  // upcoming
  return {
    start_time: beijing(15, '14:00'),
    end_time: beijing(15, '17:00'),
    register_start: beijing(5),
    register_end: beijing(10, '23:59'),
  };
}

// ==================== 活动种子数据 ====================
// zoneKey: 'chaoyang'→朝阳相伴, 'qingai'→青爱团, ''→无
const ACTIVITIES = [
  {
    zoneKey: 'chaoyang',
    phase: 'registering',
    title: '"朝阳相伴"广播节目嘉宾招募 | 来《一路畅通·他俩能成》聊聊你的故事',
    activity_type: 2, // 免费审核筛选
    fee: 0,
    gender: null,
    sort_order: 100,
    location: '北京广播电视台直播间',
    cover: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80',
    description: '朝阳区总工会的单身职工朋友们，专属你们的"出圈"机会来了！\n\n你是否想过，有一天能走进北京广播电视台的直播间，在麦克风前和主持人轻松聊天，让全北京的听众都听到你的故事、你的想法、你的生活态度？\n\n这是一次专属于"朝阳相伴"专区职工的免费福利机会，只需要你愿意表达真实的自己。\n\n节目将由北京广播电视台"他俩能成"栏目组专业团队录制，在北京交通广播FM103.9《一路畅通》节目中播出，让你的声音传遍京城。\n\n注意事项：\n1. 报名成功后工作人员将与你联系确认档期。\n2. 录制前会进行简单的沟通和准备。\n3. 本活动仅面向朝阳区工会会员开放。',
    form_config: [
      { id: fieldId(), label: '请选择您要参加的节目', type: 'select', required: true, options: ['第一期：谈恋爱/结婚，我最看重的是______', '第二期：如果七夕有"使用说明书"，上面会写什么？', '第三期：在感情里，我是一个______的人', '第四期：一个人的时候，我把生活过成了______', '第五期：______是我2026年的爱情关键词'] },
      { id: fieldId(), label: '请填写您的故事', type: 'textarea', required: true },
    ],
  },
  {
    zoneKey: 'chaoyang',
    phase: 'registering',
    title: '春日花语·朝阳青年联谊会',
    activity_type: 0,
    fee: 0,
    gender: { male: 15, female: 15 },
    sort_order: 90,
    location: '朝阳公园·花艺工坊',
    cover: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=800&q=80',
    description: '以花为媒，遇见心动。在花香四溢的午后，与TA一起体验插花艺术。',
    form_config: [],
  },
  {
    zoneKey: 'chaoyang',
    phase: 'registering',
    title: '啡常心动·职场精英咖啡沙龙',
    activity_type: 1,
    fee: 3900,
    gender: { male: 8, female: 8 },
    sort_order: 88,
    location: '三里屯·精品咖啡馆',
    cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    description: '一杯手冲，一段缘分。品味醇香，畅聊人生。',
    form_config: [
      { id: fieldId(), label: '您想参与的节目', type: 'select', required: true, options: ['手冲咖啡体验', '拉花体验', '咖啡品鉴', '都可参与'] },
    ],
  },
  {
    zoneKey: '',
    phase: 'ended',
    title: '律动青春·奥森趣味定向赛',
    activity_type: 0,
    fee: 0,
    gender: null,
    sort_order: 86,
    location: '奥林匹克森林公园南园',
    cover: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
    description: '两人一组，在绿意盎然的奥森公园完成趣味任务。协作闯关中自然拉近彼此距离~\n\n注意事项：\n1. 请穿着运动服装和舒适鞋子。\n2. 每组需自备手机用于打卡拍照。',
    form_config: [],
    slots: 40,
  },
  {
    zoneKey: 'chaoyang',
    phase: 'ended',
    title: '光影之约·电影主题交友派对',
    activity_type: 1,
    fee: 2900,
    gender: { male: 15, female: 15 },
    sort_order: 84,
    location: '建外SOHO·私人影院',
    cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
    description: '一起观影、聊感悟，在电影的世界里发现共鸣。现场还有趣味问答环节等你来挑战！\n\n注意事项：\n1. 请勿迟到，电影准点开始。\n2. 观影后留出30分钟自由交流时间。',
    form_config: [],
  },
  {
    zoneKey: '',
    phase: 'ended',
    title: '甜蜜烘焙·七夕联谊专场',
    activity_type: 1,
    fee: 4900,
    gender: { male: 8, female: 8 },
    sort_order: 82,
    location: '望京·烘焙体验馆',
    cover: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
    description: '七夕前夕，和TA一起动手制作甜蜜甜点，在烘焙的香气中邂逅属于你的那份甜蜜。\n\n注意事项：\n1. 每人可制作一份甜品并带走。\n2. 所有食材和工具由主办方提供。',
    form_config: [],
  },
  {
    zoneKey: 'qingai',
    phase: 'upcoming',
    title: '青春志爱团·秋天第一场遇见',
    activity_type: 0,
    fee: 0,
    gender: null,
    sort_order: 80,
    location: '奥森公园',
    cover: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    description: '大型青年联谊活动，趣味破冰+桌游互动+才艺展示。\n\n注意事项：\n1. 活动现场有工作人员引导，不用担心冷场。\n2. 请携带身份证件核验入场。',
    form_config: [
      { id: fieldId(), label: '您想参与的节目', type: 'select', required: true, options: ['破冰游戏', '桌游互动', '才艺展示', '都可参与'] },
      { id: fieldId(), label: '您的故事', type: 'textarea', required: true },
    ],
    slots: 60,
  },
  {
    zoneKey: 'qingai',
    phase: 'upcoming',
    title: '周末单身俱乐部·剧本杀专场',
    activity_type: 1,
    fee: 8800,
    gender: { male: 15, female: 15 },
    sort_order: 78,
    location: '朝阳大悦城·推理社',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    description: '在角色扮演中展现魅力，找到最默契的搭档。\n\n注意事项：\n1. 本局为6人硬核推理本，请确认当天能全程参与。\n2. 无需提前阅读剧本，现场分发角色。',
    form_config: [
      { id: fieldId(), label: '您擅长的角色', type: 'select', required: true, options: ['推理担当', '演技担当', '气氛担当', '萌新小白'] },
      { id: fieldId(), label: '您的故事', type: 'textarea', required: true },
    ],
  },
  {
    zoneKey: '',
    phase: 'registering',
    title: '红娘志愿者·七夕公益联谊',
    activity_type: 2,
    fee: 0,
    gender: null,
    sort_order: 76,
    location: '北京青少年服务中心',
    cover: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80',
    description: '红娘现场牵线，让缘分不再等待。\n\n注意事项：\n1. 本场为公益活动，免费参与但名额有限。\n2. 请提前到场签到领取号码牌。',
    form_config: [],
    slots: 80,
  },
  {
    zoneKey: 'chaoyang',
    phase: 'upcoming',
    title: '秋日漫步·朝阳公园摄影联谊',
    activity_type: 0,
    fee: 0,
    gender: { male: 15, female: 15 },
    sort_order: 74,
    location: '朝阳公园',
    cover: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80',
    description: '带上相机，在秋色中捕捉美好瞬间。专业摄影师带队，一边拍照一边交友，轻松又有趣。\n\n注意事项：\n1. 请自备相机或高像素手机。\n2. 适合摄影初学者和爱好者，无需专业基础。',
    form_config: [],
  },
  {
    zoneKey: 'chaoyang',
    phase: 'upcoming',
    title: '书香交友·CBD读书分享会',
    activity_type: 0,
    fee: 0,
    gender: { male: 8, female: 8 },
    sort_order: 72,
    location: 'CBD·共享书房',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
    description: '每周精选一本好书，在阅读中发现共鸣、在分享中遇见知己。让书籍成为你们的第一座桥梁。\n\n注意事项：\n1. 本月共读书目为《亲密关系》。\n2. 请提前阅读或准备一个关于本书的话题。',
    form_config: [],
  },
  {
    zoneKey: 'qingai',
    phase: 'ended',
    title: '青恋课堂·情感沟通工作坊',
    activity_type: 0,
    fee: 0,
    gender: { male: 8, female: 8 },
    sort_order: 70,
    location: '北京青少年服务中心',
    cover: 'https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=800&q=80',
    description: '专业心理咨询师带你探索内在情感模式，学会更好的表达与倾听。通过互动环节和案例分享，让你在恋爱中更加自信从容。\n\n注意事项：\n1. 请穿着舒适便装，活动含互动环节。\n2. 欢迎携带纸笔记录学习要点。',
    form_config: [],
  },
  {
    zoneKey: 'qingai',
    phase: 'registering',
    title: '红娘志愿者·温馨茶话会',
    activity_type: 0,
    fee: 0,
    gender: null,
    sort_order: 68,
    location: '北京青少年服务中心',
    cover: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80',
    description: '由经验丰富的红娘志愿者主持，在温馨的茶话会中找到心灵的共鸣。精选茶点配合分组深度交流，每位参与者都有表达和被倾听的机会。\n\n注意事项：\n1. 活动免费但名额有限，请尽早报名。\n2. 请提前准备一段简短自我介绍。',
    form_config: [],
    slots: 24,
  },
];

// ==================== 请求封装 ====================
let token = '';

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`${method} ${path} 失败: ${data.message || JSON.stringify(data)}`);
  }
  return data.data;
}

// ==================== 主流程 ====================
async function main() {
  console.log(`[1/5] 登录 ${BASE_URL} ...`);
  const loginRes = await api('POST', '/admin/v1/login', { username: USERNAME, password: PASSWORD });
  token = loginRes.access_token;
  if (!token) throw new Error('登录成功但未返回 access_token');
  console.log('      登录成功');

  console.log('[2/5] 查询专区 ...');
  const zonesRes = await api('GET', '/admin/v1/bizops/zone?page=1&size=100');
  const zoneList = Array.isArray(zonesRes) ? zonesRes : (zonesRes?.list || []);
  const zoneMap = {};
  for (const z of zoneList) zoneMap[z.name] = z.id;
  console.log(`      现有专区: ${zoneList.map((z) => z.name).join(', ') || '(空)'}`);

  const needed = [
    { name: '朝阳相伴', desc: '朝阳区总工会专属专区，面向朝阳区工会职工' },
    { name: '青爱团', desc: '北京青少年服务中心青年联谊专区' },
  ];
  for (const n of needed) {
    if (!zoneMap[n.name]) {
      const created = await api('POST', '/admin/v1/bizops/zone', {
        name: n.name,
        description: n.desc,
        status: 0,
      });
      zoneMap[n.name] = created?.id;
      console.log(`      创建专区: ${n.name} (${zoneMap[n.name]})`);
    }
  }

  console.log('[3/5] 清理同名种子活动 ...');
  const seedTitles = new Set(ACTIVITIES.map((a) => a.title));
  let page = 1;
  let removed = 0;
  while (true) {
    const res = await api('GET', `/admin/v1/bizops/activity?page=${page}&size=100`);
    const list = Array.isArray(res) ? res : (res?.list || []);
    if (!list.length) break;
    for (const act of list) {
      if (seedTitles.has(act.title)) {
        await api('DELETE', `/admin/v1/bizops/activity/${act.id}`);
        removed++;
      }
    }
    if (list.length < 100) break;
    page++;
  }
  console.log(`      清理 ${removed} 条历史种子活动`);

  console.log('[4/5] 创建活动 ...');
  const zoneKeyToName = { chaoyang: '朝阳相伴', qingai: '青爱团' };
  const phaseLabel = { ended: '已结束', registering: '报名中', upcoming: '未开始' };
  let created = 0;
  for (const a of ACTIVITIES) {
    const t = phaseTimes(a.phase);
    const payload = {
      title: a.title,
      cover: a.cover,
      image: JSON.stringify([a.cover]),
      description: a.description,
      activity_type: a.activity_type,
      start_time: t.start_time,
      end_time: t.end_time,
      register_start: t.register_start,
      register_end: t.register_end,
      location: JSON.stringify({ name: a.location, coordinate: '' }),
      fee: a.fee,
      gender_enabled: a.gender != null,
      male_slots: a.gender?.male,
      female_slots: a.gender?.female,
      slots: a.gender == null ? (a.slots ?? 30) : undefined,
      form_config: a.form_config.length > 0 ? JSON.stringify(a.form_config) : '',
      require_match_profile: true,
      sort_order: a.sort_order,
      status: 0,
      hidden: false,
    };
    const zoneId = a.zoneKey ? zoneMap[zoneKeyToName[a.zoneKey]] : undefined;
    if (zoneId) payload.zone_id = zoneId;

    await api('POST', '/admin/v1/bizops/activity', payload);
    created++;
    const typeLabel = a.activity_type === 0 ? '免费先到先得' : a.activity_type === 1 ? '收费先交费先得' : '免费审核筛选';
    console.log(`      ✓ [${phaseLabel[a.phase]}][${typeLabel}] ${a.title}${a.zoneKey ? ` (${zoneKeyToName[a.zoneKey]})` : ' (无专区)'}`);
  }

  console.log(`[5/5] 完成，共创建 ${created} 条活动`);
}

main().catch((err) => {
  console.error('\n执行失败:', err.message);
  process.exit(1);
});
