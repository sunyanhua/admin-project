import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { HeartFilled } from '@ant-design/icons';
import { activityApi, RegisterRecord, OnsiteCouple } from '@/api/services/activity-v1';
import { userApi } from '@/api/services/user';
import { getFullWidthUrl } from '@/utils/imageUtils';

// 以种子生成确定性伪随机序列（序号做种子，同一活动每次打开布局一致）——与旧系统 activscreen 一致
const mulberry32 = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 照片墙嘉宾 */
interface WallUser {
  number: number;
  nick: string;
  gender: 'male' | 'female' | '';
  userId: string;
  photo: string;
}

/** 心形布局位置（序号做种子，布局确定） */
interface WallItem extends WallUser {
  left: number;
  top: number;
  rotate: number;
  z: number;
  size: number;
}

/** 男女按序号交错排列（男1、女1、男2、女2…），避免同性别聚在墙的一侧 */
const interleaveGenders = (users: WallUser[]): WallUser[] => {
  const males = users.filter((u) => u.gender === 'male').sort((a, b) => a.number - b.number);
  const females = users.filter((u) => u.gender === 'female').sort((a, b) => a.number - b.number);
  const others = users.filter((u) => u.gender !== 'male' && u.gender !== 'female');
  const result: WallUser[] = [];
  const n = Math.max(males.length, females.length);
  for (let i = 0; i < n; i++) {
    if (males[i]) result.push(males[i]);
    if (females[i]) result.push(females[i]);
  }
  return [...result, ...others];
};

const buildWallItems = (photos: WallUser[]): WallItem[] => {
  const n = photos.length;
  const size = n <= 30 ? 16 : n <= 60 ? 13 : 10;
  return photos.map((p, i) => {
    const rnd = mulberry32(p.number || i + 1);
    const u = (i + 0.5) / n + (rnd() - 0.5) * 0.04; // 绕心一周的位置（含微抖）
    const s = 0.4 + Math.sqrt(rnd()) * 0.6;         // 深度偏向轮廓带
    const t = u * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    let nx = 0.5 + ((x + 16) / 32 - 0.5) * s;
    let ny = 0.5 + (0.5 - (y + 17) / 29) * s;       // 屏幕坐标翻转：凹点朝下
    nx = 0.5 + (nx - 0.5) * 0.78;                    // 整体聚拢
    ny = 0.5 + (ny - 0.5) * 0.78;
    return {
      ...p,
      left: 6 + nx * 88,
      top: 6 + ny * 88,
      rotate: (rnd() - 0.5) * 12,                    // ±6°
      z: Math.max(1, 11 - Math.floor(s * 10)),       // 内层在上
      size,
    };
  });
};

/** 演示模式占位头像（SVG 数据 URI，无网络依赖） */
const demoAvatar = (i: number, gender: 'male' | 'female') => {
  const palettes = ['#e04d2c', '#eb5482', '#0088cc', '#6c5ce7', '#00b894', '#f0932b', '#e056fd'];
  const c = palettes[i % palettes.length];
  const label = gender === 'male' ? '男' : '女';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><rect width='240' height='240' fill='${c}'/><text x='50%' y='58%' font-size='96' text-anchor='middle' fill='rgba(255,255,255,.9)'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const ActivityOnsite: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'list' | 'feeling' | 'lucky' | 'couple'>('list');
  const [scale, setScale] = useState(1);
  const [wall, setWall] = useState<WallUser[]>([]);
  const [couples, setCouples] = useState<OnsiteCouple[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  /** 胶片模式：交叉渐变的当前层/下一层 */
  const [current, setCurrent] = useState<WallUser | null>(null);
  const [next, setNext] = useState<WallUser | null>(null);
  const [crossing, setCrossing] = useState(false);
  /** 胶片条水平位移（当前聚焦项居中） */
  const [stripShift, setStripShift] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState(false);
  /** 现场大屏背景图（活动 onsite_config.bg_screen，未配置用默认渐变） */
  const [bgScreen, setBgScreen] = useState('');
  /** 背景模式：cover=等比铺满（不裁剪比例填满，裁掉溢出） stretch=全屏铺满（拉伸 100%×100%） */
  const [bgMode, setBgMode] = useState<'cover' | 'stretch'>('cover');
  /** 照片墙布局：heart=心形（默认） spotlight=中央聚焦+底部胶片 */
  const [wallMode, setWallMode] = useState<'heart' | 'spotlight'>('heart');
  /** 抽奖环节：cover=栏目封面 rolling=滚动中 slowing=减速中 done=已揭晓 */
  const [drawPhase, setDrawPhase] = useState<'cover' | 'rolling' | 'slowing' | 'done'>('cover');
  /** 幸运之星：静态长条带（洗牌后重复 5 份，内容固定）与滚动偏移、最终结果 */
  const [luckyStrip, setLuckyStrip] = useState<WallUser[]>([]);
  const [luckyOffset, setLuckyOffset] = useState(0);
  const [drawWinner, setDrawWinner] = useState<WallUser | null>(null);
  /** 能成时刻：男女条带与最终配对 */
  const [femaleStrip, setFemaleStrip] = useState<WallUser[]>([]);
  const [maleStrip, setMaleStrip] = useState<WallUser[]>([]);
  const [fOffset, setFOffset] = useState(0);
  const [mOffset, setMOffset] = useState(0);
  const [drawPairWinner, setDrawPairWinner] = useState<{ male: WallUser | null; female: WallUser | null } | null>(null);
  /** 转轮滚动速度（transition 时长，减速时逐级增大） */
  const [reelSpeed, setReelSpeed] = useState(90);
  /** 回卷帧：禁用过渡（周期相同内容一致，视觉无缝） */
  const [snapFrame, setSnapFrame] = useState(false);
  const luckyStripRef = useRef<WallUser[]>([]);
  const femaleStripRef = useRef<WallUser[]>([]);
  const maleStripRef = useRef<WallUser[]>([]);
  /** 每个条带的一个循环周期长度（洗牌列表长度） */
  const luckyReelLenRef = useRef(1);
  const femaleReelLenRef = useRef(1);
  const maleReelLenRef = useRef(1);
  const luckyOffsetRef = useRef(0);
  const fOffsetRef = useRef(0);
  const mOffsetRef = useRef(0);
  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoRef = useRef(false);
  /** 照片墙容器（钳制照片位置时测量用） */
  const wallRef = useRef<HTMLDivElement>(null);
  /** 用户照片缓存（脱单照片优先，缺失回退头像）；批量补拉后靠 setState 重建触发重渲染 */
  const photoMapRef = useRef<Map<string, string>>(new Map());

  /**
   * 按图片实际比例钳制位置：整卡（含旋转）完整落在墙内；
   * 聚焦放大时向心形中心移动 45% 并按移动后位置计算完整可见的缩放上限（移植旧系统 clampone）
   */
  const clampWall = useCallback(() => {
    const wallEl = wallRef.current;
    if (!wallEl) return;
    wallEl.querySelectorAll<HTMLElement>('.onsite-photo').forEach((el) => {
      const img = el.querySelector('img') as HTMLImageElement | null;
      if (!img || !img.complete || !img.naturalWidth) return;
      const wallbox = wallEl.getBoundingClientRect();
      const w = el.offsetWidth;
      if (!wallbox.width || !wallbox.height || !w) return;
      const h = (w * img.naturalHeight) / img.naturalWidth;
      const rad = ((parseFloat(el.dataset.rot || '0')) * Math.PI) / 180;
      const bw = w * Math.abs(Math.cos(rad)) + h * Math.abs(Math.sin(rad)); // 旋转后包围盒
      const bh = w * Math.abs(Math.sin(rad)) + h * Math.abs(Math.cos(rad));
      const m = Math.max(8, wallbox.width * 0.014 + 4); // 含号码牌凸出的安全边距
      const cx0 = (parseFloat(el.style.left) || 0) / 100 * wallbox.width;
      const cy0 = (parseFloat(el.style.top) || 0) / 100 * wallbox.height;
      const cx = Math.min(Math.max(cx0, bw / 2 + m), wallbox.width - bw / 2 - m);
      const cy = Math.min(Math.max(cy0, bh / 2 + m), wallbox.height - bh / 2 - m);
      el.style.left = `${(cx / wallbox.width) * 100}%`;
      el.style.top = `${(cy / wallbox.height) * 100}%`;
      // 聚焦时向心形中心移动 45%，并按移动后位置计算完整可见的缩放上限
      const fx = (wallbox.width / 2 - cx) * 0.45;
      const fy = (wallbox.height / 2 - cy) * 0.45;
      const mcx = cx + fx, mcy = cy + fy;
      const hw = w / 2, hh = h / 2;
      const fscale = Math.max(1, Math.min(2, (mcx - m) / hw, (wallbox.width - mcx - m) / hw, (mcy - m) / hh, (wallbox.height - mcy - m) / hh));
      el.style.setProperty('--fx', `${fx.toFixed(1)}px`);
      el.style.setProperty('--fy', `${fy.toFixed(1)}px`);
      el.style.setProperty('--fscale', fscale.toFixed(2));
    });
  }, []);

  const photoOf = useCallback((userId: string, avatar: string) => {
    const cached = photoMapRef.current.get(userId);
    if (cached) return cached;
    return avatar ? getFullWidthUrl(avatar) : '';
  }, []);

  /** 批量补拉用户脱单照片（每用户一次，缓存；并发分块 8） */
  const upgradePhotos = useCallback(async (userIds: string[]) => {
    const missing = [...new Set(userIds)].filter((uid) => uid && !photoMapRef.current.has(uid));
    if (!missing.length) return;
    const BATCH = 8;
    for (let i = 0; i < missing.length; i += BATCH) {
      const chunk = missing.slice(i, i + BATCH);
      await Promise.allSettled(chunk.map(async (uid) => {
        try {
          const d: any = await userApi.getUserDetail(uid);
          const p = d?.match_profile?.photos?.[0];
          if (p) photoMapRef.current.set(uid, p);
        } catch { /* 拉取失败保持头像 */ }
      }));
    }
  }, []);

  /** 签到用户照片墙数据：报名记录全量过滤已签到 */
  const fetchWall = useCallback(async () => {
    if (!id) return;
    try {
      const regs: RegisterRecord[] = [];
      let page = 1;
      while (true) {
        const res: any = await activityApi.getRegisters(id, { page, size: 100 });
        const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        regs.push(...list);
        if (list.length < 100) break;
        page++;
      }
      const checked = regs.filter((r) => !!r.checkin_at);
      const base: WallUser[] = checked.map((r) => {
        const g = r.user_profile?.gender ?? r.gender;
        return {
          number: r.onsite_number ?? 0,
          nick: r.user_profile?.nickname || r.nickname || r.user_id,
          gender: g === 1 ? 'male' : g === 2 ? 'female' : '',
          userId: r.user_id,
          photo: photoMapRef.current.get(r.user_id) || getFullWidthUrl(r.user_profile?.avatar || r.avatar || ''),
        };
      });
      base.sort((a, b) => a.number - b.number);
      const ordered = interleaveGenders(base);
      setWall(ordered);
      await upgradePhotos(ordered.map((u) => u.userId));
      // 用拉取到的照片重建（保持交错顺序）
      setWall(ordered.map((u) => ({ ...u, photo: photoMapRef.current.get(u.userId) || u.photo })));
    } catch { /* 轮询静默 */ }
  }, [id, upgradePhotos]);

  /** 心动排名数据（有现场心动的配对，按现场心动次数倒序） */
  const fetchCouples = useCallback(async () => {
    if (!id) return;
    try {
      const all: OnsiteCouple[] = [];
      let page = 1;
      while (true) {
        const res: any = await activityApi.getOnsiteLovesCouples(id, { page, size: 100 });
        const list: OnsiteCouple[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        all.push(...list);
        if (list.length < 100) break;
        page++;
      }
      setCouples(all);
      const ids = all.flatMap((c) => [c.female?.user?.user_id, c.male?.user?.user_id]).filter(Boolean) as string[];
      await upgradePhotos(ids);
      setCouples([...all]); // 照片就绪后重建渲染
    } catch { /* 轮询静默 */ }
  }, [id, upgradePhotos]);

  useEffect(() => {
    if (!id) return;
    // 活动详情：取现场大屏背景图（onsite_config.bg_screen）
    activityApi.getDetail(id).then((res: any) => {
      try {
        const obj = JSON.parse(res?.onsite_config || '{}');
        if (obj && typeof obj === 'object' && obj.bg_screen) setBgScreen(String(obj.bg_screen));
      } catch { /* 无配置保持默认渐变 */ }
    }).catch(() => {});
    fetchWall();
    fetchCouples();
    // 大屏轮询：10s 刷新（新签到/新配对实时上屏）；演示模式下跳过，避免覆盖演示数据
    const timer = setInterval(() => {
      if (demoRef.current) return;
      fetchWall();
      fetchCouples();
    }, 10000);
    return () => clearInterval(timer);
  }, [id, fetchWall, fetchCouples]);

  /** 演示模式：按 0 键从系统随机抽 50 名左右男女用户模拟心形照片墙与配对 */
  const toggleDemo = useCallback(async () => {
    if (demoRef.current) {
      demoRef.current = false;
      setDemo(false);
      setFocusIdx(0);
      fetchWall();
      fetchCouples();
      return;
    }
    try {
      // 演示数据优先取脱单档案审核通过的用户（match_audit_status 0=审核通过）
      const res: any = await userApi.getUsers({ page: 1, size: 100, match_audit_status: 0 });
      const audited: any[] = Array.isArray(res) ? res : (res?.list || []);
      let shuffled = [...audited].sort(() => Math.random() - 0.5);
      // 审核通过用户不足 50 时，从全量用户补齐（保证心形演示效果）
      if (shuffled.length < 50) {
        try {
          const res2: any = await userApi.getUsers({ page: 1, size: 100 });
          const all: any[] = Array.isArray(res2) ? res2 : (res2?.list || []);
          const existing = new Set(shuffled.map((u) => u?.user?.user_id).filter(Boolean));
          const extra = all
            .filter((u) => u && !existing.has(u?.user?.user_id))
            .sort(() => Math.random() - 0.5)
            .slice(0, 50 - shuffled.length);
          shuffled = [...shuffled, ...extra];
        } catch { /* 全量补齐失败则用合成嘉宾 */ }
      }
      // 仍不足时用合成嘉宾补足到 50
      while (shuffled.length < 50) shuffled.push(null);
      const females = shuffled.filter((u) => u?.profile?.gender === 2);
      const males = shuffled.filter((u) => u?.profile?.gender === 1);
      const others = shuffled.filter((u) => u?.profile?.gender !== 1 && u?.profile?.gender !== 2);
      // 其余（含合成）用户交替补入男女，保证演示性别均衡
      others.forEach((u, i) => (i % 2 === 0 ? males : females).push(u));
      const toWall = (list2: any[], offset: number, gender: 'male' | 'female'): WallUser[] =>
        list2.map((u, i) => ({
          number: i + 1,
          nick: u?.profile?.nickname || `演示嘉宾${offset + i + 1}`,
          gender,
          userId: `demo-${gender}-${i}`,
          photo: u?.match_profile?.photos?.[0] || u?.profile?.avatar || demoAvatar(offset + i, gender),
        }));
      const femaleWall = toWall(females, 0, 'female');
      const maleWall = toWall(males, females.length, 'male');
      const demoWall = interleaveGenders([...femaleWall, ...maleWall]);
      setFocusIdx(0);
      setWall(demoWall);
      // 演示配对：男女顺序两两配对，随机心形计数
      const demoCouples: OnsiteCouple[] = [];
      for (let i = 0; i < femaleWall.length && i < maleWall.length; i++) {
        const f = femaleWall[i];
        const m = maleWall[i];
        demoCouples.push({
          couple_id: `demo-couple-${i}`,
          female: { onsite_number: f.number, profile: { nickname: f.nick, avatar: f.photo }, user: { user_id: f.userId } },
          male: { onsite_number: m.number, profile: { nickname: m.nick, avatar: m.photo }, user: { user_id: m.userId } },
          female_loves_count: 1 + Math.floor(Math.random() * 3),
          male_loves_count: 1 + Math.floor(Math.random() * 3),
          onsite_loves_count: 1,
          matching: 1,
        });
      }
      setCouples(demoCouples);
      demoRef.current = true;
      setDemo(true);
    } catch { /* 演示数据拉取失败保持现状 */ }
  }, [fetchWall, fetchCouples]);

  // 聚焦动画：逐张放大高亮停留 2 秒，无限循环。
  // 依赖 wall.length 而非 wall 数组本身——轮询刷新不重置索引、不打断轮播序列
  useEffect(() => {
    if (tab !== 'list' || !wall.length) return;
    setFocusIdx((prev) => (prev < wall.length ? prev : 0));
    const timer = setInterval(() => {
      setFocusIdx((prev) => (prev + 1) % Math.max(wall.length, 1));
    }, 2000);
    return () => clearInterval(timer);
  }, [tab, wall.length]);

  // 渲染后按图片实际尺寸钳制位置（缓存图片 load 不触发，延时补一次）
  useEffect(() => {
    if (tab !== 'list' || !wall.length) return;
    const t = setTimeout(clampWall, 60);
    return () => clearTimeout(t);
  }, [tab, wall, clampWall]);

  // 胶片模式：交叉渐变——旧图渐隐的同时新图渐入，中间不留空白。
  // 同一嘉宾的数据刷新（轮询/照片升级）跳过重放，避免闪烁
  const lastFadedRef = useRef<string>('');
  useEffect(() => {
    if (wallMode !== 'spotlight' || !wall.length) return;
    const cur = wall[focusIdx % wall.length];
    if (!cur) return;
    const key = `${cur.userId}-${cur.number}`;
    if (lastFadedRef.current === key && current?.userId === cur.userId) return;
    lastFadedRef.current = key;
    setNext(cur);
    const raf = requestAnimationFrame(() => setCrossing(true));
    const t = setTimeout(() => {
      setCurrent(cur);
      setNext(null);
      setCrossing(false);
    }, 550);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [focusIdx, wallMode, wall]);

  // 胶片模式：列表平移使当前聚焦项居中（图片加载完成后需重新测量，onLoad 补触发）
  const centerStrip = useCallback(() => {
    if (wallMode !== 'spotlight') return;
    const track = stripRef.current;
    if (!track || !wall.length) return;
    const active = track.querySelector<HTMLElement>(`[data-film-index="${focusIdx % wall.length}"]`);
    if (!active) return;
    const viewW = track.clientWidth;
    const aL = active.offsetLeft;
    const aW = active.offsetWidth;
    setStripShift(viewW / 2 - (aL + aW / 2));
  }, [wallMode, focusIdx, wall]);

  useEffect(() => {
    centerStrip();
  }, [centerStrip]);

  /** 切换界面并立即拉取对应最新数据（演示模式下保持演示数据不刷新） */
  const switchTab = useCallback((next: 'list' | 'feeling') => {
    setTab(next);
    if (demoRef.current) return;
    if (next === 'list') fetchWall();
    else fetchCouples();
  }, [fetchWall, fetchCouples]);

  const clearDrawTimer = useCallback(() => {
    if (drawTimerRef.current) {
      clearTimeout(drawTimerRef.current);
      drawTimerRef.current = null;
    }
  }, []);

  const randOf = <T,>(arr: T[]): T | null => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);

  const malesOf = useCallback(() => wall.filter((u) => u.gender === 'male'), [wall]);
  const femalesOf = useCallback(() => wall.filter((u) => u.gender === 'female'), [wall]);

  /**
   * 老虎机条带：洗牌后【反序】重复 copies 份拼接（内容固定，滚动靠偏移驱动）。
   * 反序 + 正向位移（条带下移）实现「下一张照片从上方进入、向下移动」的老虎机方向；
   * 对齐公式按 offset % len 取模，与顺序无关，减速停格逻辑不受影响。
   */
  const buildStrip = useCallback((users: WallUser[], copies = 5): WallUser[] => {
    if (!users.length) return [];
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    const rev = [...shuffled].reverse();
    const arr: WallUser[] = [];
    for (let i = 0; i < copies; i++) arr.push(...rev);
    return arr;
  }, []);

  /** 回卷：滚动超过 4 圈后瞬间跳回（内容周期相同，禁用过渡做到视觉无缝） */
  const wrapOffset = useCallback((len: number, offset: number): number => {
    if (offset >= len * 4) {
      setSnapFrame(true);
      setTimeout(() => setSnapFrame(false), 0);
      return offset - len * 4;
    }
    return offset;
  }, []);

  /** 进入幸运之星（快捷键 3）：先显示栏目封面，按 O 开始滚动 */
  const startLucky = useCallback(() => {
    clearDrawTimer();
    const strip = buildStrip([...wall]);
    luckyStripRef.current = strip;
    luckyReelLenRef.current = wall.length || 1;
    setLuckyStrip(strip);
    luckyOffsetRef.current = 0;
    setLuckyOffset(0);
    setReelSpeed(90);
    setTab('lucky');
    setDrawPhase('cover');
    setDrawWinner(null);
  }, [clearDrawTimer, wall, buildStrip]);

  /** 进入能成时刻（快捷键 4） */
  const startCouple = useCallback(() => {
    clearDrawTimer();
    const males = malesOf();
    const females = femalesOf();
    // 某一性别不足时退回全体嘉宾，保证转轮可用
    const fStrip = buildStrip(females.length ? females : [...wall]);
    const mStrip = buildStrip(males.length ? males : [...wall]);
    femaleStripRef.current = fStrip;
    maleStripRef.current = mStrip;
    femaleReelLenRef.current = (females.length || wall.length) || 1;
    maleReelLenRef.current = (males.length || wall.length) || 1;
    setFemaleStrip(fStrip);
    setMaleStrip(mStrip);
    fOffsetRef.current = 0;
    mOffsetRef.current = 0;
    setFOffset(0);
    setMOffset(0);
    setReelSpeed(90);
    setTab('couple');
    setDrawPhase('cover');
    setDrawPairWinner(null);
  }, [clearDrawTimer, malesOf, femalesOf, wall, buildStrip]);

  /** O：开始滚动（条带自上而下快速移动，照片首尾相连） */
  const beginRoll = useCallback(() => {
    if ((tab !== 'lucky' && tab !== 'couple') || drawPhase !== 'cover') return;
    if (tab === 'lucky' && !luckyStripRef.current.length) return;
    if (tab === 'couple' && (!femaleStripRef.current.length || !maleStripRef.current.length)) return;
    setDrawPhase('rolling');
    clearDrawTimer();
    setReelSpeed(90);
    const tick = () => {
      if (tab === 'lucky') {
        luckyOffsetRef.current = wrapOffset(luckyReelLenRef.current, luckyOffsetRef.current + 1);
        setLuckyOffset(luckyOffsetRef.current);
      } else {
        fOffsetRef.current = wrapOffset(femaleReelLenRef.current, fOffsetRef.current + 1);
        mOffsetRef.current = wrapOffset(maleReelLenRef.current, mOffsetRef.current + 1);
        setFOffset(fOffsetRef.current);
        setMOffset(mOffsetRef.current);
      }
      drawTimerRef.current = setTimeout(tick, 90);
    };
    tick();
  }, [tab, drawPhase, clearDrawTimer, wrapOffset]);

  /** P：减速并慢慢停下——减速步数预计算到恰好落在获奖者上，最后一步停稳即定格，不再额外跑牌 */
  const slowRoll = useCallback(() => {
    if ((tab !== 'lucky' && tab !== 'couple') || drawPhase !== 'rolling') return;
    setDrawPhase('slowing');
    clearDrawTimer();
    const isLucky = tab === 'lucky';
    const winner = randOf(wall);
    const maleWinner = randOf(malesOf());
    const femaleWinner = randOf(femalesOf());

    // 距获奖者还需前进的步数（0=下一步即落在获奖者）
    const stepsTo = (offsetNow: number, idx: number, len: number): number => {
      if (idx < 0 || len <= 1) return 0;
      return ((idx - ((offsetNow + 1) % len)) % len + len) % len;
    };

    /**
     * 各转轮解耦计算减速步数：nF/nM 各自恰好落在获奖者（不足 8 步时按各自周期补整圈），
     * 总步数取两者较大值——先到先停，另一方继续滚到自己的获奖者。
     * 避免两个转轮长度互质约束无解导致的死循环（能成时刻卡死根因）。
     */
    const calcSteps = (): { nF: number; nM: number; total: number } => {
      if (isLucky) {
        const len = luckyReelLenRef.current;
        const d = stepsTo(luckyOffsetRef.current, luckyStripRef.current.findIndex((u) => u.userId === winner?.userId), len);
        let n = d + 1;
        while (n < 8) n += Math.max(1, len);
        return { nF: n, nM: 0, total: n };
      }
      const fLen = Math.max(1, femaleReelLenRef.current);
      const mLen = Math.max(1, maleReelLenRef.current);
      const dF = stepsTo(fOffsetRef.current, femaleStripRef.current.findIndex((u) => u.userId === femaleWinner?.userId), fLen);
      const dM = stepsTo(mOffsetRef.current, maleStripRef.current.findIndex((u) => u.userId === maleWinner?.userId), mLen);
      let nF = dF + 1;
      while (nF < 8) nF += fLen;
      let nM = dM + 1;
      while (nM < 8) nM += mLen;
      return { nF, nM, total: Math.max(nF, nM) };
    };

    const { nF, nM, total } = calcSteps();
    // 减速时长序列（三次方 ease-in：前段快速降速、最后两张切换明显更慢，整体约 4.5 秒内停下）
    const raw = Array.from({ length: total }, (_, i) => 80 + 720 * Math.pow(i / Math.max(1, total - 1), 3));
    const rawSum = raw.reduce((a, b) => a + b, 0) || 1;
    const durations = raw.map((d) => Math.max(70, Math.round((d / rawSum) * 4500)));

    const inc = (i: number) => {
      if (isLucky) {
        if (i < total) {
          luckyOffsetRef.current = wrapOffset(luckyReelLenRef.current, luckyOffsetRef.current + 1);
          setLuckyOffset(luckyOffsetRef.current);
        }
      } else {
        if (i < nF) {
          fOffsetRef.current = wrapOffset(femaleReelLenRef.current, fOffsetRef.current + 1);
          setFOffset(fOffsetRef.current);
        }
        if (i < nM) {
          mOffsetRef.current = wrapOffset(maleReelLenRef.current, mOffsetRef.current + 1);
          setMOffset(mOffsetRef.current);
        }
      }
    };

    const step = (i: number) => {
      if (i >= total) {
        // 最后一步滑动完成后再揭晓，定格在获奖者
        drawTimerRef.current = setTimeout(() => {
          if (isLucky) {
            setDrawWinner(winner);
          } else {
            setDrawPairWinner({ male: maleWinner, female: femaleWinner });
          }
          setDrawPhase('done');
        }, durations[total - 1] + 60);
        return;
      }
      drawTimerRef.current = setTimeout(() => {
        setReelSpeed(durations[i]);
        inc(i);
        step(i + 1);
      }, durations[i]);
    };
    step(0);
  }, [tab, drawPhase, clearDrawTimer, wall, malesOf, femalesOf, wrapOffset]);

  // 键盘切换：0 演示 / 1 嘉宾一览 / 2 心动排名 / 3 幸运之星 / 4 能成时刻 / z 布局 / o 开始滚动 / p 减速停下
  useEffect(() => {
    const onkey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === '0') toggleDemo();
      else if (e.key === '1') switchTab('list');
      else if (e.key === '2') switchTab('feeling');
      else if (e.key === '3') startLucky();
      else if (e.key === '4') startCouple();
      else if (e.key === 'z' || e.key === 'Z') setWallMode((m) => (m === 'heart' ? 'spotlight' : 'heart'));
      else if (e.key === 'o' || e.key === 'O') beginRoll();
      else if (e.key === 'p' || e.key === 'P') slowRoll();
    };
    window.addEventListener('keydown', onkey);
    return () => window.removeEventListener('keydown', onkey);
  }, [toggleDemo, switchTab, startLucky, startCouple, beginRoll, slowRoll]);

  // 离开抽奖环节时清理滚动定时器
  useEffect(() => {
    if (tab !== 'lucky' && tab !== 'couple') clearDrawTimer();
  }, [tab, clearDrawTimer]);

  const applyScale = (delta: number) => {
    setScale((prev) => Math.min(1.25, Math.max(0.2, Math.round((prev + delta) * 100) / 100)));
  };

  /** 工作区按钮样式 */
  const toolBtn: React.CSSProperties = { background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 12 };
  const toolBtnActive: React.CSSProperties = { ...toolBtn, background: '#e04d2c' };

  const wallItems = buildWallItems(wall);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: bgScreen
          ? (bgMode === 'stretch'
            ? `url(${bgScreen}) center / 100% 100% no-repeat`
            : `url(${bgScreen}) center / cover no-repeat`)
          : 'linear-gradient(160deg,#2b0a3d 0%,#4a1030 45%,#7a1a2e 100%)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'inherit',
      }}
    >
      {/* 演示模式徽章（仅演示时显示） */}
      {demo && (
        <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', zIndex: 5 }}>
          <span style={{ padding: '2px 10px', borderRadius: 10, background: '#e04d2c', color: '#fff', fontSize: 13 }}>演示模式</span>
        </div>
      )}

      {/* 右上角工作区：鼠标悬停显示，移走隐藏 */}
      <div className="onsite-tools">
        <div style={{ background: 'rgba(0,0,0,.55)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10, whiteSpace: 'nowrap' }}>
          {/* 横向压缩 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ marginRight: 4 }}>横向压缩</span>
            <button onClick={() => applyScale(-0.05)} style={toolBtn}>－</button>
            <span style={{ minWidth: 46, textAlign: 'center', fontWeight: 'bold' }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => applyScale(0.05)} style={toolBtn}>＋</button>
          </div>
          {/* 背景模式（未配置背景图时不显示） */}
          {bgScreen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 4 }}>背景模式</span>
              <button onClick={() => setBgMode('cover')} style={bgMode === 'cover' ? toolBtnActive : toolBtn}>等比铺满</button>
              <button onClick={() => setBgMode('stretch')} style={bgMode === 'stretch' ? toolBtnActive : toolBtn}>全屏铺满</button>
            </div>
          )}
          {/* 界面切换（按钮注明快捷键，两行每行两个；展示切换为纯切换无高亮态） */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ alignSelf: 'flex-start', marginRight: 4, lineHeight: '26px' }}>界面切换</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 6 }}>
              <button onClick={() => switchTab('list')} style={tab === 'list' ? toolBtnActive : toolBtn}>嘉宾展示(1)</button>
              <button onClick={() => switchTab('feeling')} style={tab === 'feeling' ? toolBtnActive : toolBtn}>心动排名(2)</button>
              <button onClick={startLucky} style={tab === 'lucky' ? toolBtnActive : toolBtn}>幸运之星(3)</button>
              <button onClick={startCouple} style={tab === 'couple' ? toolBtnActive : toolBtn}>能成时刻(4)</button>
              <button onClick={toggleDemo} style={demo ? toolBtnActive : toolBtn}>演示模式(0)</button>
              <button onClick={() => setWallMode((m) => (m === 'heart' ? 'spotlight' : 'heart'))} style={toolBtn}>展示切换(z)</button>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div style={{ height: '100vh', transform: `scaleX(${scale})`, transformOrigin: 'center top' }}>
        {tab === 'lucky' ? (
          /* ====== 幸运之星（3）：转轮式随机抽一人（照片自上而下滚动，首尾相连） ====== */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5vh' }}>
            {drawPhase === 'cover' ? (
              <>
                <div className="draw-cover-title">幸运之星</div>
                <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '3vh' }}>从现场嘉宾中随机抽取一位幸运之星</div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '2.6vh' }}>按 O 开始 · 按 P 减速停止</div>
              </>
            ) : (
              <>
                {luckyStrip.length > 0 && (
                  <div className={`draw-reel-frame lucky${drawPhase === 'done' ? ' win' : ''}`}>
                    <div className="draw-reel-window">
                      <div className="draw-reel-strip" style={{ transform: `translateY(calc(24vw * ${luckyOffset}))`, transition: snapFrame ? 'none' : `transform ${reelSpeed}ms linear` }}>
                        {luckyStrip.map((u, i) => (
                          <div key={`${u.userId}-${i}`} className="draw-reel-item">
                            <img src={u.photo} alt={u.nick} />
                            <span className={`onsite-number gender-${u.gender}`}>{u.number || '-'}</span>
                            <span className="draw-nick">{u.nick}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {drawPhase === 'done' && drawWinner && (
                  <>
                    <div style={{ color: '#ffd700', fontSize: '4.5vh', fontWeight: 'bold', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
                      恭喜 {drawWinner.number || ''} 号 {drawWinner.nick}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '2.6vh' }}>按 3 重新开始</div>
                  </>
                )}
              </>
            )}
          </div>
        ) : tab === 'couple' ? (
          /* ====== 能成时刻（4）：双转轮随机抽一对（左女右男） ====== */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5vh' }}>
            {drawPhase === 'cover' ? (
              <>
                <div className="draw-cover-title">能成时刻</div>
                <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '3vh' }}>从现场嘉宾中随机抽取一对幸运组合</div>
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '2.6vh' }}>按 O 开始 · 按 P 减速停止</div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8vw' }}>
                  {/* 女方转轮 */}
                  {femaleStrip.length > 0 && (
                    <div className={`draw-reel-frame couple${drawPhase === 'done' ? ' win' : ''}`}>
                      <div className="draw-reel-window">
                        <div className="draw-reel-strip" style={{ transform: `translateY(calc(20vw * ${fOffset}))`, transition: snapFrame ? 'none' : `transform ${reelSpeed}ms linear` }}>
                          {femaleStrip.map((u, i) => (
                            <div key={`f-${u.userId}-${i}`} className="draw-reel-item">
                              <img src={u.photo} alt={u.nick} />
                              <span className="onsite-number gender-female">{u.number || '-'}</span>
                              <span className="draw-nick">{u.nick}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* 男方转轮 */}
                  {maleStrip.length > 0 && (
                    <div className={`draw-reel-frame couple${drawPhase === 'done' ? ' win' : ''}`}>
                      <div className="draw-reel-window">
                        <div className="draw-reel-strip" style={{ transform: `translateY(calc(20vw * ${mOffset}))`, transition: snapFrame ? 'none' : `transform ${reelSpeed}ms linear` }}>
                          {maleStrip.map((u, i) => (
                            <div key={`m-${u.userId}-${i}`} className="draw-reel-item">
                              <img src={u.photo} alt={u.nick} />
                              <span className="onsite-number gender-male">{u.number || '-'}</span>
                              <span className="draw-nick">{u.nick}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {drawPhase === 'done' && drawPairWinner && (
                  <>
                    <div style={{ color: '#ffd700', fontSize: '4.5vh', fontWeight: 'bold', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
                      恭喜 {drawPairWinner.female?.nick} × {drawPairWinner.male?.nick}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '2.6vh' }}>按 4 重新开始</div>
                  </>
                )}
              </>
            )}
          </div>
        ) : tab === 'list' ? (
          wallItems.length === 0 ? (
            <div style={{ paddingTop: '30vh', textAlign: 'center', fontSize: '4vh', color: 'rgba(255,255,255,.5)' }}>暂无签到嘉宾</div>
          ) : wallMode === 'spotlight' ? (
            /* 方案1：中央聚焦 + 底部胶片（按 Z 切换） */
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* 中央聚焦嘉宾：双层交叉渐变，切换不留空白 */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, paddingTop: '2vh' }}>
                <div style={{ position: 'relative', height: '64vh', width: '46vw', maxWidth: '100%' }}>
                  {/* key 按嘉宾身份：晋升时当前层重建挂载、无过渡直接显示，避免从 0 重淡入造成闪白 */}
                  {current && (
                    <div key={`cur-${current.userId}-${current.number}`} style={{ position: 'absolute', inset: 0, textAlign: 'center', height: '100%', opacity: crossing ? 0 : 1, transition: 'opacity .5s ease' }}>
                      <img src={current.photo} alt={current.nick} style={{ height: 'calc(100% - 4.5vh)', maxWidth: '46vw', borderRadius: '1.3vh', border: 'solid 2px rgba(255,255,255,.6)', boxShadow: '0 8px 30px rgba(0,0,0,.4)' }} />
                      <div style={{ marginTop: '1.5vh', color: '#fff', fontSize: '3vh', fontWeight: 'bold' }}>
                        {current.number || '-'} - {current.nick}
                      </div>
                    </div>
                  )}
                  {next && (
                    <div key={`next-${next.userId}-${next.number}`} style={{ position: 'absolute', inset: 0, textAlign: 'center', height: '100%', opacity: crossing ? 1 : 0, transition: 'opacity .5s ease' }}>
                      <img src={next.photo} alt={next.nick} style={{ height: 'calc(100% - 4.5vh)', maxWidth: '46vw', borderRadius: '1.3vh', border: 'solid 2px rgba(255,255,255,.6)', boxShadow: '0 8px 30px rgba(0,0,0,.4)' }} />
                      <div style={{ marginTop: '1.5vh', color: '#fff', fontSize: '3vh', fontWeight: 'bold' }}>
                        {next.number || '-'} - {next.nick}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* 底部胶片条：平移使当前聚焦项居中，无滚动条 */}
              <div ref={stripRef} style={{ height: '20vh', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', height: '100%', padding: '1.5vh 2vw', width: 'max-content', transform: `translateX(${stripShift}px)`, transition: 'transform .6s ease' }}>
                  {wall.map((p, i) => (
                    <div
                      key={`film-${p.userId}-${p.number}`}
                      data-film-index={i}
                      onClick={() => setFocusIdx(i)}
                      style={{ flexShrink: 0, height: '15vh', position: 'relative', cursor: 'pointer', opacity: i === focusIdx % wall.length ? 1 : 0.45, transition: 'opacity .4s ease' }}
                    >
                      <img src={p.photo} alt={p.nick} onLoad={centerStrip} style={{ height: '100%', borderRadius: 6, border: i === focusIdx % wall.length ? '3px solid #e04d2c' : '2px solid rgba(255,255,255,.5)', objectFit: 'cover', display: 'block' }} />
                      <span className={`onsite-number gender-${p.gender}`} style={{ fontSize: '0.9vw', minWidth: '1.9vw', height: '1.9vw' }}>{p.number || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div ref={wallRef} style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
              {wallItems.map((p, i) => (
                <div
                  key={`${p.userId}-${p.number}`}
                  data-rot={p.rotate}
                  className={`onsite-photo${i === focusIdx ? ' focus' : ''}`}
                  style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.size}vw`, zIndex: i === focusIdx ? 50 : p.z, transform: `translate(-50%,-50%) rotate(${p.rotate}deg)` }}
                >
                  <span className={`onsite-number gender-${p.gender}`}>{p.number || '-'}</span>
                  <img src={p.photo} alt={p.nick} onLoad={clampWall} />
                  <span className="onsite-nick">{p.nick}</span>
                </div>
              ))}
            </div>
          )
        ) : couples.length === 0 ? (
          <div style={{ paddingTop: '30vh', textAlign: 'center', fontSize: '4vh', color: 'rgba(255,255,255,.5)' }}>暂无配对</div>
        ) : (
          <div style={{ height: '100%', overflowY: 'auto', padding: '6vh 3vw 10vh' }}>
            {couples.map((c) => {
              const f = c.female;
              const m = c.male;
              const fPhoto = photoOf(f?.user?.user_id || '', f?.profile?.avatar || '');
              const mPhoto = photoOf(m?.user?.user_id || '', m?.profile?.avatar || '');
              const fLoves = Math.min(c.female_loves_count ?? 0, 3);
              const mLoves = Math.min(c.male_loves_count ?? 0, 3);
              return (
                <div key={c.couple_id} style={{ height: '47.5vh', boxSizing: 'border-box', padding: '2vh 0', overflow: 'hidden', border: 'solid 1px #e04d2c', borderRadius: '1.3vh', background: 'rgba(224,77,44,.12)', marginBottom: '1.5vh', textAlign: 'center' }}>
                  {/* 女方 */}
                  <div style={{ display: 'inline-block', width: '28.55vw', overflow: 'hidden', verticalAlign: 'top' }}>
                    <div style={{ height: '36vh', lineHeight: '36vh' }}>
                      {fPhoto ? <img src={fPhoto} alt="" style={{ maxWidth: '100%', maxHeight: '100%', verticalAlign: 'middle', borderRadius: '1.3vh' }} /> : null}
                    </div>
                    <div style={{ marginTop: '1vh', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', lineHeight: '4.5vh', fontSize: '3.2vh', color: '#fff', fontWeight: 'bold', background: 'rgba(0,0,0,.5)', borderRadius: '1vh', padding: '0 1.5vw' }}>
                        {f?.onsite_number ?? '-'} - {f?.profile?.nickname || '-'}
                      </span>
                    </div>
                  </div>
                  {/* 心形计数 */}
                  <div style={{ display: 'inline-block', width: '14.64vw', height: '100%', boxSizing: 'border-box', paddingTop: '15vh', overflow: 'hidden', fontSize: '5.5vh', verticalAlign: 'top' }}>
                    <div style={{ marginBottom: '3.5vh', color: '#ff5b8f' }}>
                      {Array.from({ length: fLoves }).map((_, i) => <HeartFilled key={`fl${i}`} style={{ width: '3.5vw', fontSize: '3.2vw' }} />)}
                    </div>
                    <div style={{ color: '#4da3ff' }}>
                      {Array.from({ length: mLoves }).map((_, i) => <HeartFilled key={`ml${i}`} style={{ width: '3.5vw', fontSize: '3.2vw' }} />)}
                    </div>
                  </div>
                  {/* 男方 */}
                  <div style={{ display: 'inline-block', width: '28.55vw', overflow: 'hidden', verticalAlign: 'top' }}>
                    <div style={{ height: '36vh', lineHeight: '36vh' }}>
                      {mPhoto ? <img src={mPhoto} alt="" style={{ maxWidth: '100%', maxHeight: '100%', verticalAlign: 'middle', borderRadius: '1.3vh' }} /> : null}
                    </div>
                    <div style={{ marginTop: '1vh', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', lineHeight: '4.5vh', fontSize: '3.2vh', color: '#fff', fontWeight: 'bold', background: 'rgba(0,0,0,.5)', borderRadius: '1vh', padding: '0 1.5vw' }}>
                        {m?.onsite_number ?? '-'} - {m?.profile?.nickname || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 照片墙样式（移植自旧系统 activscreen） */}
      <style>{`
        .onsite-tools { position: fixed; top: 0; right: 0; width: 430px; height: 160px; z-index: 100; opacity: 0; transition: opacity .3s; display: flex; align-items: flex-start; justify-content: flex-end; padding: 10px 14px; }
        .onsite-tools:hover { opacity: 1; }
        .onsite-photo { position: absolute; transition: transform .5s, opacity .5s; opacity: .85; }
        .onsite-photo img { width: 100%; height: auto; display: block; border-radius: 1.3vh; border: solid 2px rgba(255,255,255,.6); box-shadow: 0 3px 8px rgba(0,0,0,.35); }
        .onsite-photo.focus { transform: translate(calc(-50% + var(--fx,0px)), calc(-50% + var(--fy,0px))) scale(var(--fscale,2)) rotate(0deg) !important; opacity: 1; }
        .onsite-photo.focus img { border-color: #e04d2c; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
        .onsite-number { position: absolute; left: 5%; top: 4%; min-width: 2.4vw; height: 2.4vw; padding: 0 .4vw; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #e04d2c; color: #fff; font-size: 1.2vw; font-weight: bold; line-height: 1; white-space: nowrap; z-index: 2; }
        .onsite-number.gender-male { background: #0088cc; }
        .onsite-number.gender-female { background: #eb5482; }
        .onsite-nick { position: absolute; left: 0; right: 0; bottom: 0; padding: 2px 4px; text-align: center; background: rgba(0,0,0,.45); color: #fff; font-size: 1.1vw; border-radius: 0 0 1.3vh 1.3vh; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* 抽奖环节（幸运之星/能成时刻）：转轮式滚动，照片首尾相连 */
        .draw-cover-title { font-size: 9vh; font-weight: 800; color: #ffd700; letter-spacing: 8px; text-shadow: 0 4px 24px rgba(0,0,0,.5); }
        /* 卡片比例 3:4（宽:高）；边框/光晕在外框，内窗口无边框且高度与卡片完全一致 */
        .draw-reel-frame { width: 18vw; border: solid 2px rgba(255,255,255,.5); border-radius: 1.6vh; background: rgba(0,0,0,.25); overflow: hidden; }
        .draw-reel-frame.couple { width: 15vw; }
        .draw-reel-window { height: 24vw; overflow: hidden; }
        .draw-reel-frame.couple .draw-reel-window { height: 20vw; }
        .draw-reel-strip { display: flex; flex-direction: column; will-change: transform; }
        .draw-reel-item { position: relative; width: 100%; height: 24vw; flex-shrink: 0; }
        .draw-reel-frame.couple .draw-reel-item { height: 20vw; }
        .draw-reel-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .draw-reel-item .onsite-number { left: 2%; top: 2%; }
        .draw-nick { position: absolute; left: 0; right: 0; bottom: 0; padding: 4px 6px; text-align: center; background: rgba(0,0,0,.5); color: #fff; font-size: 1.6vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .draw-reel-frame.win { border-color: #ffd700; box-shadow: 0 0 50px rgba(255,215,0,.8); }
      `}</style>
    </div>
  );
};

export default ActivityOnsite;
