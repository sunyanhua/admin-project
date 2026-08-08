/**
 * 活动种子数据脚本
 * 基于 DEMO 页面的真实活动数据，调用 API 创建活动
 *
 * 用法: node scripts/seed-activities.js
 * 需要先设置环境变量: ADMIN_USERNAME / ADMIN_PASSWORD
 */

const BASE_URL = process.env.VITE_API_BASE_URL || 'https://tlnc-test.vbegin.com.cn';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  if (data.code !== undefined && data.code !== 0) {
    throw new Error(`${method} ${path} => code=${data.code} message=${data.message}`);
  }
  return data.data;
}

function toISO(d) {
  // d is like "2026-08-16T14:00:00+08:00"
  return new Date(d).toISOString();
}

const COVER_IMAGES = {
  cafe: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
  flower: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=800&q=80',
  outdoor: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80',
  cinema: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
  baking: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
  party: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
  boardgame: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  volunteer: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80',
  photo: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80',
  reading: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
  workshop: 'https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=800&q=80',
  tea: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&q=80',
  broadcast: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80',
};

const INNER_IMAGES = {
  cafe: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=480&fit=crop'],
  flower: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=480&fit=crop'],
  outdoor: ['https://images.unsplash.com/photo-1516216628859-9bccecab13ca?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=480&fit=crop'],
  cinema: ['https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&h=480&fit=crop'],
  baking: ['https://images.unsplash.com/photo-1486427944344-c71833e553c2?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&h=480&fit=crop'],
  party: ['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=480&fit=crop'],
  boardgame: ['https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1571087961908-45d85f037bdd?w=600&h=480&fit=crop'],
  volunteer: ['https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=480&fit=crop'],
  photo: ['https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=480&fit=crop'],
  reading: ['https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=480&fit=crop'],
  workshop: ['https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=480&fit=crop'],
  tea: ['https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=480&fit=crop'],
  broadcast: ['https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&h=480&fit=crop', 'https://images.unsplash.com/photo-1490127252417-7c393f993ee4?w=600&h=480&fit=crop'],
};

const ACTIVITIES = [
  {
    title: '"朝阳相伴"广播节目嘉宾招募 | 来《一路畅通·他俩能成》聊聊你的故事',
    description: '<p>走进北京广播电视台直播间，让你的声音传遍京城！</p><p><br></p><p>这是一档专属于朝阳区工会职工的出圈机会——你不仅能在电波中分享自己的故事、展现个人魅力，还能让全城听众认识你、关注你。</p><p><br></p><p><strong>活动亮点：</strong></p><ul><li>专业主持人引导，轻松不冷场</li><li>真实声音交流，比文字和照片更有温度</li><li>节目播出后提供完整音频回放</li></ul>',
    activity_type: 0, // 免费
    zone_key: 'chaoyang',
    cover_key: 'broadcast',
    location_name: '北京广播电视台直播间',
    location_coordinate: '116.461,39.908',
    slots: 30, current: 8,
    start_time: '2026-09-01T09:00:00+08:00', end_time: '2026-12-01T18:00:00+08:00',
    register_start: '2026-08-01T00:00:00+08:00', register_end: '2026-11-30T23:59:00+08:00',
    sort_order: 99,
  },
  {
    title: '春日花语·朝阳青年联谊会',
    description: '<p>以花为媒，遇见心动。在花香四溢的午后，与TA一起体验插花艺术。</p><p><br></p><p>本次联谊会邀请专业花艺师现场教学，从选材到造型全程指导。你不需要任何基础，只需带着一颗开放的心来，在指尖绽放的不仅是花朵，更可能是一段美好的缘分。</p><p><br></p><p><strong>活动环节：</strong></p><ol><li>破冰游戏——用花语自我介绍</li><li>花艺教学——专业老师手把手教</li><li>自由创作——两人一组完成作品</li><li>作品互评——选出最心动花束</li></ol>',
    activity_type: 0,
    zone_key: 'chaoyang',
    cover_key: 'flower',
    location_name: '朝阳公园·花艺工坊',
    location_coordinate: '116.476,39.941',
    slots: 30, current: 18,
    start_time: '2026-08-20T14:00:00+08:00', end_time: '2026-08-20T17:00:00+08:00',
    register_start: '2026-08-01T00:00:00+08:00', register_end: '2026-08-18T23:59:00+08:00',
    sort_order: 80,
  },
  {
    title: '啡常心动·职场精英咖啡沙龙',
    description: '<p>一杯手冲，一段缘分。品味醇香，畅聊人生。</p><p><br></p><p>在静谧的精品咖啡馆里，由资深咖啡师带领大家体验手冲咖啡的魅力。从研磨到注水，每一个步骤都需要耐心与专注——就像经营一段感情。</p><p><br></p><p><strong>活动特色：</strong></p><ul><li>精品咖啡品鉴（三款产地豆）</li><li>手冲教学与实操</li><li>咖啡主题破冰互动</li><li>每人可带走一包精品挂耳咖啡</li></ul>',
    activity_type: 1, // 收费
    zone_key: 'chaoyang',
    cover_key: 'cafe',
    location_name: '三里屯·精品咖啡馆',
    location_coordinate: '116.455,39.932',
    fee: 3900, slots: 16, current: 8,
    start_time: '2026-08-26T10:00:00+08:00', end_time: '2026-08-26T12:30:00+08:00',
    register_start: '2026-08-10T00:00:00+08:00', register_end: '2026-08-24T23:59:00+08:00',
    sort_order: 75,
  },
  {
    title: '律动青春·奥森趣味定向赛',
    description: '<p>协作闯关中自然拉近彼此距离~</p><p><br></p><p>在奥林匹克森林公园的绿荫中，两人一组完成趣味定向任务。不需要跑步基础，全程约3公里，沿途设置6个打卡点，每个打卡点都有需要配合才能完成的趣味挑战。</p><p><br></p><p><strong>路线特色：</strong>穿过湿地栈道、登顶仰山眺望、林间小道漫步，在最美的城市绿肺中遇见彼此。</p>',
    activity_type: 0,
    zone_key: '',
    cover_key: 'outdoor',
    location_name: '奥林匹克森林公园南园',
    location_coordinate: '116.393,40.019',
    slots: 40, current: 22,
    start_time: '2026-09-02T08:30:00+08:00', end_time: '2026-09-02T12:00:00+08:00',
    register_start: '2026-08-20T00:00:00+08:00', register_end: '2026-08-30T23:59:00+08:00',
    sort_order: 70, status: 1, // 已截止
  },
  {
    title: '光影之约·电影主题交友派对',
    description: '<p>在电影的世界里发现共鸣，现场还有趣味问答和角色扮演环节。</p><p><br></p><p>我们精心挑选了一部浪漫爱情电影，在私人影院的舒适环境中共同观赏。观影后更有电影知识问答和经典桥段即兴表演环节——这是展现幽默感和表现力的绝佳机会！</p><p><br></p><p><strong>包含：</strong>爆米花+饮品、电影周边纪念品</p>',
    activity_type: 1,
    zone_key: 'chaoyang',
    cover_key: 'cinema',
    location_name: '建外SOHO·私人影院',
    location_coordinate: '116.464,39.905',
    fee: 2900, slots: 20, current: 20,
    start_time: '2026-09-09T14:30:00+08:00', end_time: '2026-09-09T17:30:00+08:00',
    register_start: '2026-08-25T00:00:00+08:00', register_end: '2026-09-07T23:59:00+08:00',
    sort_order: 65, status: 1, // 已满
  },
  {
    title: '甜蜜烘焙·七夕联谊专场',
    description: '<p>和TA一起动手制作甜蜜甜点，邂逅属于你的那份甜蜜。</p><p><br></p><p>在专业烘焙老师的指导下，两人一组完成一款法式甜点的制作。从称量到装饰，每一个步骤都需要默契配合。做出来的甜点可以带走，也可以现场分享给心仪的TA~</p><p><br></p><p><strong>本期甜点：</strong>法式马卡龙 + 提拉米苏杯</p>',
    activity_type: 1,
    zone_key: '',
    cover_key: 'baking',
    location_name: '望京·烘焙体验馆',
    location_coordinate: '116.483,39.997',
    fee: 4900, slots: 24, current: 12,
    start_time: '2026-09-16T14:00:00+08:00', end_time: '2026-09-16T17:00:00+08:00',
    register_start: '2026-09-01T00:00:00+08:00', register_end: '2026-09-14T23:59:00+08:00',
    sort_order: 60,
  },
  {
    title: '青春志爱团·秋天第一场遇见',
    description: '<p>大型青年联谊活动，趣味破冰+桌游互动+才艺展示。</p><p><br></p><p>这是青爱团品牌下季度最重磅的联谊活动！预计60位优秀单身青年参与，设置多个互动环节：</p><p><br></p><p><strong>活动流程：</strong></p><ol><li>签到分组（按兴趣爱好匹配）</li><li>大型破冰游戏——"谁是卧底"联谊版</li><li>桌游自由选择（狼人杀/UNO/剧本杀）</li><li>才艺展示环节（自愿报名）</li><li>心动互选——写下心仪对象的编号</li></ol>',
    activity_type: 0,
    zone_key: 'qingai',
    cover_key: 'party',
    location_name: '奥林匹克森林公园·南园草坪',
    location_coordinate: '116.393,40.019',
    slots: 60, current: 35,
    start_time: '2026-09-23T09:00:00+08:00', end_time: '2026-09-23T16:00:00+08:00',
    register_start: '2026-09-10T00:00:00+08:00', register_end: '2026-09-21T23:59:00+08:00',
    sort_order: 55,
  },
  {
    title: '周末单身俱乐部·剧本杀专场',
    description: '<p>在角色扮演中展现魅力，找到最默契的搭档。</p><p><br></p><p>精选高分情感推理本《花与剑》，6-8人配置，时长约4小时。在精心布置的场景中，每位玩家都将获得独特的角色身份和任务。推理过程中需要频繁交流、互相配合——这是检验默契度的绝佳场景！</p><p><br></p><p><strong>包含：</strong>专业DM主持、角色服装道具、剧本杀后聚餐交流</p>',
    activity_type: 1,
    zone_key: 'qingai',
    cover_key: 'boardgame',
    location_name: '朝阳大悦城·推理社',
    location_coordinate: '116.522,39.923',
    fee: 8800, slots: 8, current: 4,
    start_time: '2026-09-30T14:00:00+08:00', end_time: '2026-09-30T18:30:00+08:00',
    register_start: '2026-09-15T00:00:00+08:00', register_end: '2026-09-28T23:59:00+08:00',
    sort_order: 50,
  },
  {
    title: '红娘志愿者·七夕公益联谊',
    description: '<p>红娘现场牵线，让缘分不再等待。</p><p><br></p><p>由北京青少年服务中心组织的公益联谊活动，20位经验丰富的红娘志愿者现场服务。不同于传统的"相亲角"，我们采用"一对一红娘服务"模式：每位红娘匹配4位参与者，先了解你的择偶需求和性格特点，再为你精准推荐合适的对象。</p><p><br></p><p><strong>公益活动，全程免费。</strong></p>',
    activity_type: 0,
    zone_key: '',
    cover_key: 'volunteer',
    location_name: '北京青少年服务中心',
    location_coordinate: '116.430,39.921',
    slots: 80, current: 40,
    start_time: '2026-09-17T14:00:00+08:00', end_time: '2026-09-17T17:30:00+08:00',
    register_start: '2026-09-01T00:00:00+08:00', register_end: '2026-09-15T23:59:00+08:00',
    sort_order: 45, status: 1, // 已截止
  },
  {
    title: '秋日漫步·朝阳公园摄影联谊',
    description: '<p>带上相机，在秋色中捕捉美好瞬间。一边拍照一边交友。</p><p><br></p><p>秋天的朝阳公园色彩斑斓，是最适合摄影的季节。本次活动邀请专业人像摄影师全程指导，两人一组互为模特和摄影师，在最美的秋景中留下美好回忆。</p><p><br></p><p><strong>适合人群：</strong>摄影爱好者、喜欢户外活动、想轻松交友的朋友。手机党也可以参加，摄影师会教手机摄影技巧~</p>',
    activity_type: 0,
    zone_key: 'chaoyang',
    cover_key: 'photo',
    location_name: '朝阳公园·南门集合',
    location_coordinate: '116.476,39.941',
    slots: 30, current: 15,
    start_time: '2026-10-06T09:00:00+08:00', end_time: '2026-10-06T12:00:00+08:00',
    register_start: '2026-09-20T00:00:00+08:00', register_end: '2026-10-04T23:59:00+08:00',
    sort_order: 40,
  },
  {
    title: '书香交友·CBD读书分享会',
    description: '<p>每周精选一本好书，在阅读中发现共鸣、在分享中遇见知己。</p><p><br></p><p>本期共读书目：《爱的五种语言》。这本经典之作帮助无数人理解了自己和伴侣的情感需求。在静谧的共享书房里，我们围坐一起，分享读后感、交流情感观念——你会发现，有些人的观点和你出奇地一致。</p><p><br></p><p><strong>活动形式：</strong>自由朗读+分组讨论+观点交换，轻松不尬聊。</p>',
    activity_type: 0,
    zone_key: 'chaoyang',
    cover_key: 'reading',
    location_name: 'CBD·共享书房',
    location_coordinate: '116.463,39.912',
    slots: 20, current: 8,
    start_time: '2026-10-13T14:30:00+08:00', end_time: '2026-10-13T17:00:00+08:00',
    register_start: '2026-09-28T00:00:00+08:00', register_end: '2026-10-11T23:59:00+08:00',
    sort_order: 35,
  },
  {
    title: '青恋课堂·情感沟通工作坊',
    description: '<p>专业心理咨询师带你探索内在情感模式。</p><p><br></p><p>本次工作坊邀请国家二级心理咨询师、婚恋关系专家张老师主讲。通过互动体验和角色扮演，帮助参与者：</p><p><br></p><ul><li>了解自己的依恋类型</li><li>掌握非暴力沟通技巧</li><li>学习冲突化解方法</li><li>发现并突破情感表达障碍</li></ul><p><br></p><p><strong>特别说明：</strong>这不是传统讲座，而是高度互动的体验式工作坊，请穿着舒适的衣服参加。</p>',
    activity_type: 2, // 免费，审核筛选
    zone_key: 'qingai',
    cover_key: 'workshop',
    location_name: '北京青少年服务中心·多功能厅',
    location_coordinate: '116.430,39.921',
    slots: 40, current: 40,
    start_time: '2026-10-20T14:00:00+08:00', end_time: '2026-10-20T17:00:00+08:00',
    register_start: '2026-10-05T00:00:00+08:00', register_end: '2026-10-18T23:59:00+08:00',
    sort_order: 30, status: 1, // 已满
  },
  {
    title: '红娘志愿者·温馨茶话会',
    description: '<p>由经验丰富的红娘志愿者主持的温馨茶话会。</p><p><br></p><p>一壶好茶，三两好友，围坐畅谈。这次的茶话会以"情感故事分享"为主题——有人分享自己的恋爱经历，有人讲讲身边的缘分故事。红娘志愿者会在轻松的氛围中穿插互动小游戏，让每个人都能自然地融入其中。</p><p><br></p><p><strong>茶点包含：</strong>龙井、普洱、茉莉花茶搭配中式糕点</p>',
    activity_type: 2, // 免费，审核筛选
    zone_key: 'qingai',
    cover_key: 'tea',
    location_name: '北京青少年服务中心·茶室',
    location_coordinate: '116.430,39.921',
    slots: 24, current: 12,
    start_time: '2026-10-27T15:00:00+08:00', end_time: '2026-10-27T17:30:00+08:00',
    register_start: '2026-10-12T00:00:00+08:00', register_end: '2026-10-25T23:59:00+08:00',
    sort_order: 25,
  },
];

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.error('请设置环境变量 ADMIN_USERNAME / ADMIN_PASSWORD');
    process.exit(1);
  }

  // 1. Login
  console.log(`[1/4] 登录 (${username}@${BASE_URL})...`);
  const loginData = await request('POST', '/admin/v1/login', { username, password });
  console.log('  login response keys:', Object.keys(loginData || {}));
  const token = loginData?.access_token;
  if (!token) { console.error('  ❌ 未获取到 token，响应:', JSON.stringify(loginData).substring(0, 200)); process.exit(1); }
  console.log('  ✅ 登录成功, token:', token.substring(0, 20) + '...');

  // 2. Get zones
  console.log('[2/4] 获取专区列表...');
  const zones = await request('GET', '/admin/v1/zone?page=1&size=100', null, token);
  const zoneList = Array.isArray(zones) ? zones : (zones?.list || []);
  const zoneMap = {};
  for (const z of zoneList) {
    if (z.name.includes('朝阳')) zoneMap['chaoyang'] = z.id;
    if (z.name.includes('青爱') || z.name.includes('青春')) zoneMap['qingai'] = z.id;
  }
  console.log(`  ✅ 共 ${zoneList.length} 个专区`, zoneMap);

  // 3. Create activities
  console.log('[3/4] 创建活动...');
  let created = 0;
  for (const a of ACTIVITIES) {
    const zoneId = a.zone_key ? zoneMap[a.zone_key] : undefined;
    const coverUrl = COVER_IMAGES[a.cover_key] || 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&q=80';
    const innerUrls = INNER_IMAGES[a.cover_key] || [];

    const payload = {
      title: a.title,
      cover: coverUrl,
      image: JSON.stringify(innerUrls),
      activity_type: a.activity_type,
      description: a.description,
      start_time: toISO(a.start_time),
      end_time: toISO(a.end_time),
      register_start: toISO(a.register_start),
      register_end: toISO(a.register_end),
      location: JSON.stringify({ name: a.location_name, coordinate: a.location_coordinate || '' }),
      fee: a.fee || 0,
      slots: a.slots || 0,
      form_config: '',
      require_match_profile: true,
      sort_order: a.sort_order || 0,
      status: a.status || 0,
    };
    if (zoneId) payload.zone_id = zoneId;

    try {
      const result = await request('POST', '/admin/v1/activity', payload, token);
      created++;
      const typeLabel = ['免费','收费','审核'][a.activity_type];
      const zoneLabel = a.zone_key ? ` [${a.zone_key}]` : '';
      console.log(`  ✅ #${created} ${typeLabel}${zoneLabel} ${a.title.substring(0, 30)}... → id=${result.id}`);
    } catch (err) {
      console.error(`  ❌ ${a.title.substring(0, 30)}... ${err.message}`);
    }
  }

  console.log(`[4/4] 完成！共创建 ${created}/${ACTIVITIES.length} 条活动`);
}

main().catch(err => { console.error(err); process.exit(1); });
