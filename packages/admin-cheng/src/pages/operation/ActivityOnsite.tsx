import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Select } from 'antd';
import { HeartFilled } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, RegisterRecord, OnsiteCouple, OnsitePairingAdminItem, OnsitePairingUserAdmin } from '@/api/services/activity-v1';
import { userApi } from '@/api/services/user';
import { getFullWidthUrl, getMediumUrl } from '@/utils/imageUtils';
import { parseGroupIndex } from '@/components/operation/onsiteGrouping.utils';
import { buildLuckyPools, pickGenderedWinners, assignGroupRepTargets, filterGroupRepPools, LUCKY_GENDER_OPTIONS, LuckyGender } from './luckyPools.utils';
import { parseRoutine, RoutineStep } from '@/components/operation/onsiteRoutine.utils';

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
  /** 分组名（已分组时展示在卡片上） */
  group?: string;
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

const buildWallItems = (photos: WallUser[], sizeOverride?: number): WallItem[] => {
  const n = photos.length;
  const size = sizeOverride ?? (n <= 30 ? 16 : n <= 60 ? 13 : 10);
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

/** 默契度排名单人侧：现场序号 + 图片 + 昵称（right=女生侧，内容靠右对齐；已分组显示分组标签） */
const RankSide: React.FC<{ nick: string; photo: string; gender?: number; number?: number; right?: boolean }> = ({ nick, photo, gender, number, right }) => (
  <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start' }}>
    <div style={{ position: 'relative', width: '11vw' }}>
      {photo ? (
        <img src={photo} alt={nick} style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: '1vh', border: 'solid 2px rgba(255,255,255,.6)', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', aspectRatio: '3 / 4', borderRadius: '1vh', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)', fontSize: '4vh' }}>
          {gender === 1 ? '男' : gender === 2 ? '女' : '?'}
        </div>
      )}
      <span className="onsite-nick" style={{ fontSize: '2.6vh' }}>
        <span className={`onsite-number-inline${gender === 1 ? ' gender-male' : gender === 2 ? ' gender-female' : ''}`}>{number ?? '-'}</span>
        {nick}
      </span>
    </div>
  </div>
);

/** 组中抽组/单组选人的展示块 */
interface BlockItem {
  key: string;
  label: string;
  photo?: string;
  number?: number | null;
  gender?: 'male' | 'female' | '';
  group?: string;
}

/** 组中抽组/单组选人展示块：组名方块或用户卡片（bright=明暗跳动中亮起、win=中奖金色放大、normal/drawn=灰度+蒙版降亮） */
const BlockCard: React.FC<{ item: BlockItem; state: 'normal' | 'bright' | 'win' | 'drawn' }> = ({ item, state }) => {
  const border = state === 'win' ? '3px solid #ffd700' : state === 'bright' ? '2px solid rgba(255,255,255,.8)' : '1px solid rgba(255,255,255,.35)';
  const shadow = state === 'win' ? '0 0 40px rgba(255,215,0,.95)' : 'none';
  const scale = state === 'win' ? 'scale(1.15)' : 'scale(1)';
  const transition = 'transform .3s, box-shadow .3s, opacity .3s';
  if (item.photo) {
    // 未选中：灰度 + 蒙版 + 徽章/昵称同步降亮；已抽：更深；明暗跳动亮起/中奖：全彩醒目
    const mask = state === 'drawn' ? 'rgba(0,0,0,.8)' : state === 'normal' ? 'rgba(0,0,0,.6)' : 'transparent';
    const filter = state === 'drawn' ? 'grayscale(.9)' : state === 'normal' ? 'grayscale(.6)' : 'none';
    const opacity = state === 'drawn' ? 0.55 : 1;
    const badgeDim = state === 'drawn' ? 0.3 : state === 'normal' ? 0.5 : 1;
    return (
      <div style={{ position: 'relative', width: '12vw', borderRadius: '1vh', overflow: 'hidden', border, boxShadow: shadow, background: '#fff', boxSizing: 'border-box', transform: scale, transition, opacity }}>
        <img src={item.photo} alt={item.label} style={{ width: '100%', display: 'block', filter, transition: 'filter .3s' }} />
        {mask !== 'transparent' && <div style={{ position: 'absolute', inset: 0, background: mask }} />}
        <span className="onsite-nick" style={{
          opacity: state === 'drawn' ? 0.35 : state === 'normal' ? 0.55 : 1,
          transition: 'opacity .3s, background .3s, color .3s',
          // 中奖：昵称金色底 + 深色加粗大字，视觉突出
          ...(state === 'win' ? { background: '#ffd700', color: '#3d2a00', fontWeight: 800, fontSize: '1.35vw' } : {}),
        }}>
          <span className={`onsite-number-inline gender-${item.gender}`} style={{ opacity: badgeDim, transition: 'opacity .3s' }}>{item.number || '-'}</span>
          {item.label}
        </span>
      </div>
    );
  }
  return (
    <div style={{
      width: '10vw', height: '10vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '4vw', fontWeight: 'bold', color: state === 'win' ? '#3d2a00' : '#fff', borderRadius: '1vh', border, boxShadow: shadow, boxSizing: 'border-box',
      background: state === 'win' ? 'linear-gradient(135deg,#f7b733,#fc4a1a)' : state === 'bright' ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.12)',
      transform: scale, transition,
      opacity: state === 'drawn' ? 0.35 : state === 'normal' ? 0.55 : 1,
      filter: state === 'drawn' ? 'grayscale(.9)' : state === 'normal' ? 'grayscale(.5)' : 'none',
      textShadow: state === 'win' ? '0 2px 8px rgba(255,255,255,.6)' : 'none',
    }}>
      {item.label}
    </div>
  );
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
  const { error: showError } = useAppNotification();
  /** 下拉选中后自动失焦，避免后续快捷键被下拉框拦截（延迟执行，防止被 antd 关闭下拉时的回焦覆盖） */
  const blurAfter = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el?.closest('.ant-select')) el.blur();
    }, 150);
  };
  const [tab, setTab] = useState<'list' | 'feeling' | 'likeMe' | 'lucky' | 'couple' | 'cpRank' | 'groupRep' | 'groupDraw' | 'personDraw'>('list');
  const [scale, setScale] = useState(1);
  const [wall, setWall] = useState<WallUser[]>([]);
  const [couples, setCouples] = useState<OnsiteCouple[]>([]);
  /** 默契度排名：现场配对按默契度差异正序（未完成计算排最后） */
  const [cpRanks, setCpRanks] = useState<OnsitePairingAdminItem[]>([]);
  /** 心动排名：互相心动配对池（互心次数倒序）与当前展示的配对 */
  const [heartPool, setHeartPool] = useState<OnsiteCouple[]>([]);
  const [heartCurrent, setHeartCurrent] = useState<OnsiteCouple | null>(null);
  const heartPoolRef = useRef<OnsiteCouple[]>([]);
  /** 已展示过的配对成员（跳过原则：任何一位已出现过即跳过该对） */
  const shownHeartIdsRef = useRef<Set<string>>(new Set());
  /** 展示历史（↑ 回看上一对） */
  const heartHistoryRef = useRef<OnsiteCouple[]>([]);
  const heartCursorRef = useRef(-1);
  /** 当前是否有展示中的配对（耗尽隐藏后 ↑ 可重新显示最后一条） */
  const heartDisplayedRef = useRef(false);
  /** 数据源已耗尽提示（池中无可展示且重拉后仍无） */
  const [heartNoMore, setHeartNoMore] = useState(false);
  /** 配对切换过渡定时器（单一实例：新操作先取消旧的，避免快速连按时旧定时器覆盖新展示） */
  const heartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 组中抽组：每轮抽取组数（右上角配置） */
  const [groupDrawCount, setGroupDrawCount] = useState(1);
  /** 单组选人：指定组与每轮抽取人数（右上角配置） */
  const [personGroup, setPersonGroup] = useState('');
  const [personDrawCount, setPersonDrawCount] = useState(1);
  /** 单组选人性别要求（默认混搭，仅控制落定结果——候选展示全体组员） */
  const [personGender, setPersonGender] = useState<LuckyGender>('mix');
  /** 组中抽组/单组选人：原始顺序全部块（展示排序保持不变） */
  const [blockAll, setBlockAll] = useState<BlockItem[]>([]);
  /** 累计已抽 key（按抽中顺序） */
  const [blockDrawnKeys, setBlockDrawnKeys] = useState<string[]>([]);
  /** 本轮定格 key 列表 */
  const [blockRoundWinners, setBlockRoundWinners] = useState<string[]>([]);
  /** 滚动高亮索引（相对当前候选数组） */
  /** 明暗跳动：当前亮起的候选集合（全部候选错落不规律地忽明忽暗，P 减速后逐一定格中奖者） */
  const [blockBright, setBlockBright] = useState<Set<string>>(new Set());
  const [blockPhase, setBlockPhase] = useState<'cover' | 'rolling' | 'slowing' | 'done'>('cover');
  /** 当前候选 key（保持原始顺序；逐格锁定后从候选中移除，后续跳动跳过） */
  const blockCandidatesRef = useRef<string[]>([]);
  const blockPhaseRef = useRef<'cover' | 'rolling' | 'slowing' | 'done'>('cover');
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
  /** 背景模式：cover=等比铺满（裁掉溢出） stretch=全屏铺满（拉伸 100%×100%） contain=等比完整（图片完整显示，超出部分黑色底） */
  const [bgMode, setBgMode] = useState<'cover' | 'stretch' | 'contain'>('cover');
  /** 照片墙布局：heart=心形（默认） spotlight=中央聚焦+底部胶片 */
  const [wallMode, setWallMode] = useState<'heart' | 'spotlight'>('heart');
  /** 抽奖环节：cover=栏目封面 rolling=滚动中 slowing=减速中 done=已揭晓 */
  const [drawPhase, setDrawPhase] = useState<'cover' | 'rolling' | 'slowing' | 'done'>('cover');
  /** 幸运之星：每个转轮一条静态长条带（洗牌后重复 5 份，内容固定）与滚动偏移、最终结果 */
  const [luckyStrips, setLuckyStrips] = useState<WallUser[][]>([]);
  const [luckyOffsets, setLuckyOffsets] = useState<number[]>([]);
  /** 各转轮回卷当帧的过渡禁用标记（仅回卷的转轮置位） */
  const [luckySnaps, setLuckySnaps] = useState<boolean[]>([]);
  const [drawWinners, setDrawWinners] = useState<WallUser[]>([]);
  /** 幸运之星配置：人数=转轮数（1~5，默认 1）、性别要求（默认混搭） */
  const [luckyCount, setLuckyCount] = useState(1);
  const [luckyGender, setLuckyGender] = useState<LuckyGender>('mix');
  /** 各组代表性别要求（默认混搭=组间男女尽量均衡；2026-11-10 用户定：与其它抽取模式一致可选） */
  const [groupRepGender, setGroupRepGender] = useState<LuckyGender>('mix');
  /** 各组代表性别要求编排覆盖（仅编排步骤传参时落定；null=手动模式，按 P 时读实时配置 groupRepGender） */
  const groupRepGenderRef = useRef<LuckyGender | null>(null);
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
  const luckyStripsRef = useRef<WallUser[][]>([]);
  /** 各转轮获奖候选池（按性别要求分配；条带始终滚全体嘉宾，性别要求只决定落定结果） */
  const luckyWinnerPoolsRef = useRef<WallUser[][]>([]);
  const femaleStripRef = useRef<WallUser[]>([]);
  const maleStripRef = useRef<WallUser[]>([]);
  /** 每个条带的一个循环周期长度（洗牌列表长度） */
  const luckyReelLensRef = useRef<number[]>([]);
  const femaleReelLenRef = useRef(1);
  const maleReelLenRef = useRef(1);
  const luckyOffsetsRef = useRef<number[]>([]);
  const fOffsetRef = useRef(0);
  const mOffsetRef = useRef(0);
  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoRef = useRef(false);
  /** 照片墙容器（钳制照片位置时测量用） */
  const wallRef = useRef<HTMLDivElement>(null);
  /** 用户照片缓存（脱单照片优先，缺失回退头像）；批量补拉后靠 setState 重建触发重渲染 */
  const photoMapRef = useRef<Map<string, string>>(new Map());
  /** 报名用户现场序号映射（配对条目不带序号，默契度排名从报名记录反查） */
  const onsiteNumMapRef = useRef<Map<string, number>>(new Map());
  /** 分组名称（onsite_config.groups，照片墙与默契度排名展示用） */
  const groupsRef = useRef<string[]>([]);
  /** 大屏用户显示方式（onsite_config.user_display）：nickname=昵称（默认） real_name=姓名；state 驱动重渲染，ref 供回调读最新值 */
  const [userDisplay, setUserDisplay] = useState<'nickname' | 'real_name'>('nickname');
  const userDisplayRef = useRef<'nickname' | 'real_name'>('nickname');
  /** 报名用户真实姓名映射（用户显示=姓名时，配对/排名等仅带昵称的数据源据此替换） */
  const realNameMapRef = useRef<Map<string, string>>(new Map());
  /** 最近一次同步的编排原始 JSON（轮询去重——内容未变不触发重渲染） */
  const routineRawRef = useRef<string>('');
  /** 活动是否已配置分组（驱动各组代表/组中抽组/单组选人入口显隐） */
  const [hasGroups, setHasGroups] = useState(false);
  /** 报名用户分组名映射（默契度排名从报名记录反查） */
  const groupMapRef = useRef<Map<string, string>>(new Map());
  /** 流程编排（onsite_config.routine）：提前编排好的现场操作步骤（按 9 进入编排执行模式） */
  const [routine, setRoutine] = useState<RoutineStep[]>([]);
  const [routineMode, setRoutineMode] = useState(false);
  const [routineIdx, setRoutineIdx] = useState(0);
  /** 编排执行提示（步骤跳过原因等，大屏顶部横幅） */
  const [routineNotice, setRoutineNotice] = useState('');
  /** 右上角面板内下拉框展开中——展开时面板保持显示（下拉是面板的一部分，操作时不隐藏） */
  const [toolSelectOpen, setToolSelectOpen] = useState(false);
  const routineModeRef = useRef(false);
  const routineIdxRef = useRef(0);
  /** 编排执行时本步抽取数量（慢速定格数量来源；自由模式为 null 走右上角配置） */
  const blockCountRef = useRef<number | null>(null);
  /** 编排执行时单组选人本步性别要求（自由模式为 null 走右上角配置） */
  const blockGenderRef = useRef<LuckyGender | null>(null);
  /** 编排组中选组指定结果（按序落地；仅首轮生效，出结果后清空恢复随机） */
  const blockFixedRef = useRef<string[] | null>(null);
  /** 编排·组中选组指定结果已揭晓——该步骤仅执行一轮，揭晓后 O 不再进入下一轮 */
  const blockFixedDoneRef = useRef(false);

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

  /** 签到用户照片墙数据：报名记录全量过滤已签到；返回刷新后的照片墙（3/4 先查询再以此为筛选来源） */
  const fetchWall = useCallback(async (): Promise<WallUser[] | null> => {
    if (!id) return null;
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
        // 已分组的用户展示分组名（extra_data.group_index → onsite_config.groups）
        const groupIdx = parseGroupIndex(r.extra_data);
        const group = groupIdx != null ? (groupsRef.current[groupIdx - 1] || '') : '';
        // 真实姓名入映射（用户显示=姓名时供配对/排名等数据源替换）；配置为姓名且有名 → 显示姓名，否则昵称
        const realName = r.user_match_profile?.real_name || '';
        if (realName) realNameMapRef.current.set(r.user_id, realName);
        const nick = userDisplayRef.current === 'real_name' && realName
          ? realName
          : (r.user_profile?.nickname || r.nickname || r.user_id);
        return {
          number: r.onsite_number ?? 0,
          nick,
          gender: g === 1 ? 'male' : g === 2 ? 'female' : '',
          userId: r.user_id,
          photo: photoMapRef.current.get(r.user_id) || getFullWidthUrl(r.user_profile?.avatar || r.avatar || ''),
          group,
        };
      });
      base.sort((a, b) => a.number - b.number);
      const ordered = interleaveGenders(base);
      await upgradePhotos(ordered.map((u) => u.userId));
      // 用拉取到的照片重建（保持交错顺序）
      const final = ordered.map((u) => ({ ...u, photo: photoMapRef.current.get(u.userId) || u.photo }));
      setWall(final);
      return final;
    } catch { /* 查询失败静默，调用方回退现有数据 */ }
    return null;
  }, [id, upgradePhotos]);

  /** 心动排名数据（有现场心动的配对，按现场心动次数倒序）；返回拉取到的列表（↓ 耗尽重拉用） */
  const fetchCouples = useCallback(async (): Promise<OnsiteCouple[]> => {
    if (!id) return [];
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
      return all;
    } catch { /* 查询失败静默 */ }
    return [];
  }, [id, upgradePhotos]);

  /** 默契度排名数据：未完成答题的配对不显示；现场序号从报名记录反查 */
  const fetchCpRank = useCallback(async () => {
    if (!id) return;
    try {
      // ① 报名记录反查现场序号（配对条目只回基础公开资料）
      const numMap = new Map<string, number>();
      let page = 1;
      while (true) {
        const res: any = await activityApi.getRegisters(id, { page, size: 100 });
        const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        list.forEach((r) => {
          if (r.user_id && r.onsite_number != null) numMap.set(r.user_id, r.onsite_number);
          // 分组名反查（排名卡片展示）
          if (r.user_id) {
            const gIdx = parseGroupIndex(r.extra_data);
            const gName = gIdx != null ? (groupsRef.current[gIdx - 1] || '') : '';
            if (gName) groupMapRef.current.set(r.user_id, gName);
          }
        });
        if (list.length < 100) break;
        page++;
      }
      onsiteNumMapRef.current = numMap;
      // ② 配对列表（按默契度差异正序）；未完成答题（diff_total 为空）不参与排名
      const all: OnsitePairingAdminItem[] = [];
      page = 1;
      while (true) {
        const res: any = await activityApi.getOnsitePairings(id, { page, size: 100, sort_by: 'diff' });
        const list: OnsitePairingAdminItem[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        all.push(...list);
        if (list.length < 100) break;
        page++;
      }
      const ranked = all.filter((c) => c.diff_total != null);
      setCpRanks(ranked);
      // ③ 批量补拉脱单照片（配对接口只回基础头像）；照片就绪后重建渲染
      const ids = ranked.flatMap((c) => [c.male?.user?.user_id, c.female?.user?.user_id]).filter(Boolean) as string[];
      await upgradePhotos(ids);
      setCpRanks([...ranked]);
    } catch { /* 查询失败静默 */ }
  }, [id, upgradePhotos]);

  /** 拉取活动配置（bg_screen / 分组 / 编排）：分组变化时重拉照片墙与配对（组名渲染与组筛选同源）；
   *  编排步骤仅在未执行时同步（播放中不被后台配置变更打断） */
  const refreshConfig = useCallback(async () => {
    if (!id) return;
    try {
      const res: any = await activityApi.getDetail(id);
      const obj = JSON.parse(res?.onsite_config || '{}');
      if (!obj || typeof obj !== 'object') return;
      if (obj.bg_screen) setBgScreen((prev) => (prev === String(obj.bg_screen) ? prev : String(obj.bg_screen)));
      // 用户显示方式：real_name=姓名，其余（含未配置）=昵称；变化时重建照片墙与配对（名称立即切换）
      const wantRealName = obj.user_display === 'real_name';
      if (wantRealName !== (userDisplayRef.current === 'real_name')) {
        userDisplayRef.current = wantRealName ? 'real_name' : 'nickname';
        setUserDisplay(userDisplayRef.current);
        fetchWall();
        fetchCouples();
      }
      if (typeof obj.groups === 'string') {
        const groups: string[] = obj.groups.split('|').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        const changed = groups.length !== groupsRef.current.length || groups.some((g, i) => g !== groupsRef.current[i]);
        if (changed) {
          groupsRef.current = groups;
          setHasGroups(groups.length > 0);
          // 组名变化 → 照片墙/配对卡片的组名与组筛选立即重建（2026-11-10 用户定：后台保存分组后大屏免整页刷新）
          fetchWall();
          fetchCouples();
        }
      }
      const routineRaw = JSON.stringify((obj && typeof obj === 'object' ? obj.routine : undefined) ?? null);
      if (routineRawRef.current !== routineRaw && !routineModeRef.current) {
        routineRawRef.current = routineRaw;
        setRoutine(parseRoutine(res?.onsite_config));
      }
    } catch { /* 配置拉取失败静默——保留现有配置 */ }
  }, [id, fetchWall, fetchCouples]);

  useEffect(() => {
    if (!id) return;
    refreshConfig().finally(() => {
      // 首次加载各数据源；之后不做轮询——每次按键先查询（1 签到 / 2 心动排名 / 3、4 先刷新签到 / 5 默契度）
      fetchWall();
      fetchCouples();
      fetchCpRank();
    });
  }, [id, fetchWall, fetchCouples, fetchCpRank, refreshConfig]);

  // 分组/背景/编排配置轮询（2026-11-10 用户定）：后台保存分组配置后大屏自动同步，无需刷新页面
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(() => { refreshConfig(); }, 10000);
    return () => clearInterval(timer);
  }, [id, refreshConfig]);

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
          // 演示数据带分组，展示分组徽章效果
          group: ['A', 'B', 'C'][i % 3],
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

  /** 进入心动互选（2）/ 我钟意你（3）：重置展示状态（跳过原则与历史清零）并拉取最新心动数据 */
  const enterHeartTab = useCallback((next: 'feeling' | 'likeMe') => {
    setTab(next);
    shownHeartIdsRef.current = new Set();
    heartHistoryRef.current = [];
    heartCursorRef.current = -1;
    heartDisplayedRef.current = false;
    setHeartCurrent(null);
    setHeartNoMore(false);
    if (!demoRef.current) fetchCouples();
  }, [fetchCouples]);

  /**
   * 构建心动配对池：
   * mutual=互相心动（双方均有）；single=单方心动（仅一方有）且双方均未出现在任一互心配对中。
   */
  const buildHeartPool = useCallback((list: OnsiteCouple[], mode: 'mutual' | 'single'): OnsiteCouple[] => {
    const sortByLoves = (arr: OnsiteCouple[]) => arr.sort((a, b) => (b.onsite_loves_count ?? 0) - (a.onsite_loves_count ?? 0));
    if (mode === 'mutual') {
      return sortByLoves(list.filter((c) => (c.female_loves_count ?? 0) > 0 && (c.male_loves_count ?? 0) > 0));
    }
    // 单方心动：排除所有已互相心动的人选
    const mutualIds = new Set(
      list
        .filter((c) => (c.female_loves_count ?? 0) > 0 && (c.male_loves_count ?? 0) > 0)
        .flatMap((c) => [c.male?.user?.user_id, c.female?.user?.user_id])
        .filter((x): x is string => !!x),
    );
    return sortByLoves(list.filter((c) => {
      const f = c.female_loves_count ?? 0;
      const m = c.male_loves_count ?? 0;
      if (!((f > 0) !== (m > 0))) return false;
      const ids = [c.male?.user?.user_id, c.female?.user?.user_id];
      return !ids.some((uid) => uid && mutualIds.has(uid));
    }));
  }, []);

  // 心动配对池：按模式筛选后按心动次数倒序
  useEffect(() => {
    if (tab !== 'feeling' && tab !== 'likeMe') return;
    const mode: 'mutual' | 'single' = tab === 'likeMe' ? 'single' : 'mutual';
    const pool = buildHeartPool(couples, mode);
    setHeartPool(pool);
    heartPoolRef.current = pool;
  }, [couples, tab, buildHeartPool]);

  /** 配对成员 id 列表（双方完整才算有效组合） */
  const heartIdsOf = (c: OnsiteCouple): string[] =>
    [c.male?.user?.user_id, c.female?.user?.user_id].filter((x): x is string => !!x);

  /** 展示配对：先恢复原状（缩回卡片、消失次数）再切换，新操作取消旧定时器避免覆盖 */
  const showHeartPair = (c: OnsiteCouple | null) => {
    if (heartTimerRef.current) {
      clearTimeout(heartTimerRef.current);
      heartTimerRef.current = null;
    }
    setHeartCurrent(null);
    heartTimerRef.current = setTimeout(() => {
      setHeartCurrent(c);
      heartTimerRef.current = null;
    }, 520);
  };

  /** ↓：展示下一对心动组合——双方任一已展示过则跳过；池耗尽再拉取一次，仍无则提示 */
  const showNextHeart = useCallback(async () => {
    if (tab !== 'feeling' && tab !== 'likeMe') return;
    const mode: 'mutual' | 'single' = tab === 'likeMe' ? 'single' : 'mutual';
    const tryFind = (pool: OnsiteCouple[]): number => {
      for (let i = 0; i < pool.length; i++) {
        const ids = heartIdsOf(pool[i]);
        if (ids.length === 2 && !ids.some((uid) => shownHeartIdsRef.current.has(uid))) return i;
      }
      return -1;
    };
    let idx = tryFind(heartPoolRef.current);
    if (idx === -1) {
      if (demoRef.current) {
        // 演示模式不重拉真实数据，直接提示耗尽（先恢复当前展示）
        heartDisplayedRef.current = false;
        showHeartPair(null);
        setHeartNoMore(true);
        return;
      }
      // 池中无可展示：再拉取一次匹配接口，看是否有新的心动组合
      const fresh = await fetchCouples();
      const freshPool = buildHeartPool(fresh, mode);
      heartPoolRef.current = freshPool;
      setHeartPool(freshPool);
      idx = tryFind(freshPool);
      if (idx === -1) {
        heartDisplayedRef.current = false;
        showHeartPair(null);
        setHeartNoMore(true);
        return;
      }
    }
    setHeartNoMore(false);
    const c = heartPoolRef.current[idx];
    heartIdsOf(c).forEach((uid) => shownHeartIdsRef.current.add(uid));
    heartHistoryRef.current.push(c);
    heartCursorRef.current = heartHistoryRef.current.length - 1;
    heartDisplayedRef.current = true;
    showHeartPair(c);
  }, [tab, fetchCouples]);

  /** ↑：展示上一对（回看历史，不越过最早一条；耗尽隐藏后 ↑ 重新显示最后一条） */
  const showPrevHeart = useCallback(() => {
    if ((tab !== 'feeling' && tab !== 'likeMe') || heartHistoryRef.current.length === 0) return;
    if (!heartDisplayedRef.current) {
      // 当前无展示（如耗尽后被隐藏）：重新显示历史最后一条，游标不动
      heartDisplayedRef.current = true;
      setHeartNoMore(false);
      showHeartPair(heartHistoryRef.current[heartCursorRef.current]);
      return;
    }
    if (heartCursorRef.current <= 0) return;
    heartCursorRef.current -= 1;
    showHeartPair(heartHistoryRef.current[heartCursorRef.current]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
   * 老虎机条带：洗牌后重复 copies 份拼接（内容固定，滚动靠偏移驱动）。
   * 条带末尾锚定窗口顶部（transform 负向基座），正向位移时上方的照片从顶部进入、向下移动；
   * 可见项 = 条带长度 - 1 - offset，减速对齐按取模公式计算目标位置。
   */
  const buildStrip = useCallback((users: WallUser[], copies = 5): WallUser[] => {
    if (!users.length) return [];
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    const arr: WallUser[] = [];
    for (let i = 0; i < copies; i++) arr.push(...shuffled);
    return arr;
  }, []);

  /** 回卷：滚动超过 4 圈后瞬间跳回（内容周期相同，禁用过渡做到视觉无缝）——能成时刻双转轮共用 */
  const wrapOffset = useCallback((len: number, offset: number): number => {
    if (offset >= len * 4) {
      setSnapFrame(true);
      setTimeout(() => setSnapFrame(false), 0);
      return offset - len * 4;
    }
    return offset;
  }, []);

  /**
   * 幸运之星各转轮偏移同步推进（ref 与 state 成对写入）。
   * 某个转轮越界回卷时仅该转轮当帧禁用过渡（snapFrames[i]）——全局禁过渡会让其余转轮跟着整卡跳帧。
   */
  const advanceLuckyOffsets = useCallback((fn: (offset: number, i: number) => number) => {
    luckyOffsetsRef.current = luckyOffsetsRef.current.map((o, i) => {
      const next = fn(o, i);
      const len = luckyReelLensRef.current[i];
      if (next >= len * 4) {
        setLuckySnaps((prev) => {
          const snaps = [...prev];
          snaps[i] = true;
          return snaps;
        });
        setTimeout(() => {
          setLuckySnaps((prev) => {
            const snaps = [...prev];
            snaps[i] = false;
            return snaps;
          });
        }, 0);
        return next - len * 4;
      }
      return next;
    });
    setLuckyOffsets([...luckyOffsetsRef.current]);
  }, []);

  /** 进入幸运之星（快捷键 3）：先查询最新签到数据作为转轮筛选来源，再显示栏目封面，按 O 开始滚动。编排模式传参覆盖右上角配置 */
  const startLucky = useCallback(async (override?: { count?: number; gender?: LuckyGender }) => {
    clearDrawTimer();
    const source = demoRef.current ? wall : ((await fetchWall()) ?? wall);
    const count = override?.count ?? luckyCount;
    const gender = override?.gender ?? luckyGender;
    const pools = buildLuckyPools(source, count, gender);
    // 编排模式：无符合条件的嘉宾时提示跳过（按 → 切换步骤，不卡住流程）
    if (routineModeRef.current && pools.length === 0) {
      setRoutineNotice('本步暂无符合条件的嘉宾，已跳过');
    }
    // 每个转轮独立洗牌（各转轮人组合随机、互不相同），但都滚动全体嘉宾——性别要求不体现在候选滚动中，只控制最终落定的获奖者
    const strips = pools.map(() => buildStrip(source));
    luckyStripsRef.current = strips;
    luckyWinnerPoolsRef.current = pools;
    luckyReelLensRef.current = strips.map(() => source.length || 1);
    setLuckyStrips(strips);
    // 初始偏移随机错开：起转瞬间各转轮展示不同位置，避免开滚时几个转轮一模一样整齐转动
    luckyOffsetsRef.current = strips.map(() => Math.floor(Math.random() * Math.max(1, source.length)));
    setLuckyOffsets([...luckyOffsetsRef.current]);
    setLuckySnaps(strips.map(() => false));
    setReelSpeed(90);
    setTab('lucky');
    setDrawPhase('cover');
    setDrawWinners([]);
  }, [clearDrawTimer, wall, luckyCount, luckyGender, buildStrip, fetchWall]);

  /** 进入默契度排名（快捷键 5）：演示模式用演示配对生成随机差异分排名 */
  const startCpRank = useCallback(() => {
    clearDrawTimer();
    if (demoRef.current) {
      const demoRanks: OnsitePairingAdminItem[] = couples
        .map((c, i) => ({
          id: `demo-rank-${i}`,
          seq: i + 1,
          diff_total: 1 + Math.floor(Math.random() * 30),
          male_submitted: true,
          female_submitted: true,
          male: { user: { user_id: `demo-rm-${i}` }, profile: { nickname: c.male?.profile?.nickname, avatar: c.male?.profile?.avatar, gender: 1 } },
          female: { user: { user_id: `demo-rf-${i}` }, profile: { nickname: c.female?.profile?.nickname, avatar: c.female?.profile?.avatar, gender: 2 } },
        }))
        .sort((a, b) => (a.diff_total ?? 0) - (b.diff_total ?? 0));
      // 演示现场序号 = 配对序号（与创建配对同步写序号的行为一致）
      onsiteNumMapRef.current = new Map(
        demoRanks.flatMap((c) => [
          [c.male?.user?.user_id || '', c.seq],
          [c.female?.user?.user_id || '', c.seq],
        ] as [string, number][]),
      );
      setCpRanks(demoRanks);
      setTab('cpRank');
      return;
    }
    setTab('cpRank');
    fetchCpRank();
  }, [clearDrawTimer, couples, fetchCpRank]);

  /** 默契度排名单人侧展示资料（脱单照片优先，缺失回退头像；现场序号与分组名从报名记录反查） */
  const rankUserOf = (u?: OnsitePairingUserAdmin) => {
    const userId = u?.user?.user_id || '';
    const avatar = u?.profile?.avatar || '';
    const raw = photoMapRef.current.get(userId) || avatar;
    return {
      // 用户显示=姓名且报名记录可反查姓名 → 显示姓名；否则昵称
      nick: userDisplayRef.current === 'real_name'
        ? (realNameMapRef.current.get(userId) || u?.profile?.nickname || userId || '-')
        : (u?.profile?.nickname || userId || '-'),
      photo: raw ? getMediumUrl(raw) : '',
      gender: u?.profile?.gender,
      number: userId ? onsiteNumMapRef.current.get(userId) : undefined,
      group: userId ? groupMapRef.current.get(userId) : undefined,
    };
  };

  /** 进入各组代表（6）：按分组配置每组一个转轮，组员为候选（仅已签到成员，滚动形式与幸运之星完全一致）。编排模式传参覆盖右上角配置 */
  const startGroupRep = useCallback((override?: { gender?: LuckyGender }) => {
    clearDrawTimer();
    // 仅编排传参时落定覆盖值；手动进入保持 null——按 P 时读取实时配置（与单组选人一致）
    groupRepGenderRef.current = override?.gender ?? null;
    const gender = override?.gender ?? groupRepGender;
    // 指定性别严格过滤：组内无该性别则整组不出转轮（与幸运之星缩减转轮同口径）
    const pools = filterGroupRepPools(
      groupsRef.current
        .map((g) => wall.filter((u) => u.group === g))
        .filter((p) => p.length > 0),
      gender,
    );
    // 编排模式：无已签到且已分组的成员时提示跳过（按 → 切换步骤）
    if (routineModeRef.current && pools.length === 0) {
      setRoutineNotice('本步暂无已签到且已分组的成员，已跳过');
    }
    const strips = pools.map((pool) => buildStrip(pool));
    luckyStripsRef.current = strips;
    luckyWinnerPoolsRef.current = pools;
    luckyReelLensRef.current = strips.map((_, i) => pools[i]?.length || 1);
    setLuckyStrips(strips);
    luckyOffsetsRef.current = strips.map((_, i) => Math.floor(Math.random() * Math.max(1, pools[i]?.length || 1)));
    setLuckyOffsets([...luckyOffsetsRef.current]);
    setLuckySnaps(strips.map(() => false));
    setReelSpeed(90);
    setTab('groupRep');
    setDrawPhase('cover');
    setDrawWinners([]);
  }, [clearDrawTimer, wall, buildStrip, groupRepGender]);

  /** 进入组中抽组（7）/ 单组选人（8）：重置候选池与抽取状态（完全重抽入口；候选仅已签到成员）。编排模式传参覆盖指定组 */
  const startBlockDraw = useCallback((kind: 'group' | 'person', override?: { group?: string }) => {
    clearDrawTimer();
    if (kind === 'group') {
      const blocks: BlockItem[] = groupsRef.current.map((g) => ({ key: g, label: g }));
      setBlockAll(blocks);
      blockCandidatesRef.current = blocks.map((b) => b.key);
    } else {
      const g = override?.group || personGroup || groupsRef.current[0] || '';
      const blocks: BlockItem[] = wall
        .filter((u) => u.group === g)
        .map((u) => ({ key: u.userId, label: u.nick, photo: u.photo, number: u.number, gender: u.gender, group: u.group }));
      // 编排模式：指定组暂无已签到成员时提示跳过（按 → 切换步骤）
      if (routineModeRef.current && blocks.length === 0) {
        setRoutineNotice(`分组「${g}」暂无已签到成员，本步已跳过`);
      }
      setBlockAll(blocks);
      blockCandidatesRef.current = blocks.map((b) => b.key);
    }
    setBlockDrawnKeys([]);
    setBlockRoundWinners([]);
    setBlockBright(new Set());
    setBlockPhase('cover');
    blockPhaseRef.current = 'cover';
    setTab(kind === 'group' ? 'groupDraw' : 'personDraw');
  }, [clearDrawTimer, wall, personGroup]);

  /** O：明暗跳动开始（组中抽组/单组选人）——全部候选错落不规律地随机忽明忽暗；done 后按 O 继续下一轮 */
  const beginBlock = useCallback(() => {
    if (tab !== 'groupDraw' && tab !== 'personDraw') return;
    if (blockPhaseRef.current === 'rolling' || blockPhaseRef.current === 'slowing') return;
    if (!blockCandidatesRef.current.length) return;
    // 编排·组中选组指定结果：仅执行一轮，揭晓后 O 不再进入下一轮（随机步骤保持可连续多轮）
    if (routineModeRef.current && blockFixedDoneRef.current) return;
    clearDrawTimer();
    setBlockRoundWinners([]);
    setBlockPhase('rolling');
    blockPhaseRef.current = 'rolling';
    // 单组选人跳动稍慢（照片卡观感更清晰）
    const interval = tab === 'personDraw' ? 130 : 90;
    const tick = () => {
      // 每帧随机一部分候选亮起，其余变暗——错落不规律
      const cands = blockCandidatesRef.current;
      const next = new Set<string>();
      for (const k of cands) {
        if (Math.random() < 0.35) next.add(k);
      }
      setBlockBright(next);
      drawTimerRef.current = setTimeout(tick, interval);
    };
    tick();
  }, [tab, clearDrawTimer]);

  /** P：停止闪烁后逐一定格中奖者（变亮放大；选中之间间距尽量短） */
  const slowBlock = useCallback(() => {
    if ((tab !== 'groupDraw' && tab !== 'personDraw') || blockPhaseRef.current !== 'rolling') return;
    clearDrawTimer();
    setBlockPhase('slowing');
    blockPhaseRef.current = 'slowing';
    const candidates = blockCandidatesRef.current;
    // 编排·组中选组指定结果：按指定分组顺序落地（仅首轮）；未指定恢复随机
    const fixed = tab === 'groupDraw' && blockFixedRef.current?.length
      ? blockFixedRef.current.filter((g) => candidates.includes(g))
      : null;
    const count = fixed ? fixed.length : (blockCountRef.current ?? (tab === 'groupDraw' ? groupDrawCount : personDrawCount));
    const take = Math.min(Math.max(1, count), candidates.length);
    const winners = (() => {
      if (fixed) return fixed.slice(0, take);
      if (tab === 'personDraw') {
        // 单组选人：性别要求只控制落定结果（候选展示全体组员）——混搭男女尽量均分
        const genderMap = new Map(blockAll.map((b) => [b.key, b.gender || '']));
        const guests = candidates.map((k) => ({ userId: k, gender: (genderMap.get(k) || '') as 'male' | 'female' | '' }));
        return pickGenderedWinners(guests, count, blockGenderRef.current ?? personGender).map((w) => w.userId);
      }
      return [...candidates].sort(() => Math.random() - 0.5).slice(0, take);
    })();
    // 停止闪烁：全部候选即刻变暗
    setBlockBright(new Set());
    const locked: string[] = [];
    // 逐一定格：中奖者变亮放大锁定、从候选中移除；选中之间间距尽量短（约 220ms）
    const lock = (wi: number) => {
      if (wi >= winners.length) {
        // 本轮完成：定格块移入已抽，候选保持原始顺序
        setBlockRoundWinners(locked);
        setBlockDrawnKeys((prev) => [...prev, ...locked]);
        setBlockBright(new Set(locked));
        setBlockPhase('done');
        blockPhaseRef.current = 'done';
        // 指定结果仅作用于本轮，后续轮次恢复随机；编排模式下指定结果步骤仅执行一轮
        if (fixed) blockFixedDoneRef.current = true;
        blockFixedRef.current = null;
        return;
      }
      const winner = winners[wi];
      locked.push(winner);
      setBlockRoundWinners([...locked]);
      setBlockBright(new Set(locked));
      blockCandidatesRef.current = blockCandidatesRef.current.filter((k) => k !== winner);
      drawTimerRef.current = setTimeout(() => lock(wi + 1), 220);
    };
    // 短暂停顿后开始定格（P 按下与首个中奖之间留一点悬念）
    drawTimerRef.current = setTimeout(() => lock(0), 320);
  }, [tab, clearDrawTimer, groupDrawCount, personDrawCount, personGender, blockAll]);

  // 单组选人：切换指定组时重置抽取
  useEffect(() => {
    if (tab === 'personDraw') startBlockDraw('person');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personGroup]);

  // 配置变更时：若停留在幸运之星封面，立即按新配置重建转轮；滚动中/已揭晓时留到下次按 3 生效。
  // 依赖仅取配置本身——wall 数据变化不重建（避免封面反复洗牌），tab/drawPhase 在闭包中读取当前值
  useEffect(() => {
    if (tab === 'lucky' && drawPhase === 'cover') startLucky();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luckyCount, luckyGender]);

  // 各组代表性别变更：封面状态立即按新性别重建转轮（无符合条件的组不展示；与幸运之星一致）
  useEffect(() => {
    if (tab === 'groupRep' && drawPhase === 'cover') startGroupRep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupRepGender]);

  /** 进入能成时刻（快捷键 4）：先查询最新签到数据作为转轮筛选来源 */
  const startCouple = useCallback(async () => {
    clearDrawTimer();
    const source = demoRef.current ? wall : ((await fetchWall()) ?? wall);
    const males = source.filter((u) => u.gender === 'male');
    const females = source.filter((u) => u.gender === 'female');
    // 某一性别不足时退回全体嘉宾，保证转轮可用
    const fStrip = buildStrip(females.length ? females : [...source]);
    const mStrip = buildStrip(males.length ? males : [...source]);
    femaleStripRef.current = fStrip;
    maleStripRef.current = mStrip;
    femaleReelLenRef.current = (females.length || source.length) || 1;
    maleReelLenRef.current = (males.length || source.length) || 1;
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
  }, [clearDrawTimer, wall, buildStrip, fetchWall]);

  /** O：开始滚动（条带自上而下快速移动，照片首尾相连；组中抽组/单组选人为方块高亮轮扫） */
  const beginRoll = useCallback(() => {
    if (tab === 'groupDraw' || tab === 'personDraw') {
      beginBlock();
      return;
    }
    if ((tab !== 'lucky' && tab !== 'couple' && tab !== 'groupRep') || drawPhase !== 'cover') return;
    if ((tab === 'lucky' || tab === 'groupRep') && !luckyStripsRef.current.length) return;
    if (tab === 'couple' && (!femaleStripRef.current.length || !maleStripRef.current.length)) return;
    setDrawPhase('rolling');
    clearDrawTimer();
    setReelSpeed(90);
    const tick = () => {
      if (tab === 'lucky' || tab === 'groupRep') {
        advanceLuckyOffsets((o) => o + 1);
      } else {
        fOffsetRef.current = wrapOffset(femaleReelLenRef.current, fOffsetRef.current + 1);
        mOffsetRef.current = wrapOffset(maleReelLenRef.current, mOffsetRef.current + 1);
        setFOffset(fOffsetRef.current);
        setMOffset(mOffsetRef.current);
      }
      drawTimerRef.current = setTimeout(tick, 90);
    };
    tick();
  }, [tab, drawPhase, clearDrawTimer, wrapOffset, advanceLuckyOffsets, beginBlock]);

  /** P：减速并慢慢停下——减速步数预计算到恰好落在获奖者上，最后一步停稳即定格，不再额外跑牌 */
  const slowRoll = useCallback(() => {
    if (tab === 'groupDraw' || tab === 'personDraw') {
      slowBlock();
      return;
    }
    if ((tab !== 'lucky' && tab !== 'couple' && tab !== 'groupRep') || drawPhase !== 'rolling') return;
    setDrawPhase('slowing');
    clearDrawTimer();
    const isLucky = tab === 'lucky' || tab === 'groupRep';

    // 距获奖者还需前进的步数（0=下一步即落在获奖者）。target 为偏移的目标余数
    const stepsTo = (offsetNow: number, target: number, len: number): number => {
      if (target < 0 || len <= 1) return 0;
      return ((target - ((offsetNow + 1) % len)) % len + len) % len;
    };

    /**
     * 各转轮解耦计算减速步数：各自恰好落在获奖者（不足 8 步时按各自周期补整圈），
     * 8 步减速序列各转轮同步推进——每步全体前进 1 张，8 步后各自恰好停在自己的获奖者。
     * 避免多个转轮长度互质约束无解导致的死循环（能成时刻卡死根因）。
     * 可见项 = 条带长度 - 1 - 偏移，目标余数 = (条带长度 - 1 - 获奖者索引) % 周期。
     */
    /** 幸运之星：各转轮独立抽奖——获奖者从配置的性别候选池中无放回抽取，跨转轮不重复（池已按 userId 去重，转轮数 ≤ 池人数，候选恒非空）；条带展示全体嘉宾，仅落定结果体现性别要求 */
    let luckyWinners: WallUser[] = [];
    let luckySteps: number[] = [];
    /** 能成时刻：双转轮获奖者与各自步数 */
    let pairWinners: { male: WallUser | null; female: WallUser | null } | null = null;
    let nF = 0;
    let nM = 0;
    if (isLucky) {
      const picked = new Set<string>();
      luckyWinners = [];
      // 各组代表性别名额分配（2026-11-10 用户定：与其它抽取模式一致可选男/女/不限/混搭——
      // 混搭=组间男女尽量均衡：目标性别名额随机分配到各组，单一性别组强制该性别）；
      // 组内再从目标性别随机抽取（无则回退另一性别/任意组员）
      let groupAssignment: ('male' | 'female' | 'any')[] = [];
      if (tab === 'groupRep') {
        const groupPools = luckyStripsRef.current.map((_, i) =>
          luckyWinnerPoolsRef.current[i].filter((u) => !picked.has(u.userId)),
        );
        groupAssignment = assignGroupRepTargets(
          groupPools.map((pool) => ({
            male: pool.filter((u) => u.gender === 'male').length,
            female: pool.filter((u) => u.gender === 'female').length,
          })),
          // 手动模式按 P 时读实时配置；编排步骤参数优先（进入时已落定 ref）
          groupRepGenderRef.current ?? groupRepGender,
        );
      }
      luckySteps = luckyStripsRef.current.map((strip, i) => {
        const len = luckyReelLensRef.current[i];
        const pool = luckyWinnerPoolsRef.current[i].filter((u) => !picked.has(u.userId));
        let cands: WallUser[];
        if (tab === 'groupRep') {
          const males = pool.filter((u) => u.gender === 'male');
          const females = pool.filter((u) => u.gender === 'female');
          const target = groupAssignment[i];
          // 严格按目标性别抽取（2026-11-10 用户定：无符合条件的组已在进入时过滤，不做跨性别回退）；
          // 空池兜底 pool 仅防滚动中改性别导致 randOf 空数组
          cands = target === 'male' ? (males.length ? males : pool)
            : target === 'female' ? (females.length ? females : pool)
            : pool;
        } else {
          cands = pool;
        }
        const w = randOf(cands) as WallUser;
        picked.add(w.userId);
        luckyWinners.push(w);
        const idx = strip.findIndex((u) => u.userId === w.userId);
        const target = (((strip.length - 1 - idx) % len) + len) % len;
        return stepsTo(luckyOffsetsRef.current[i], target, len) + 1;
      });
    } else {
      // 获奖者直接从条带（首周期）中抽取——轮询刷新 wall 后 winner 仍在条带内，findIndex 恒有效
      const maleWinner = randOf(maleStripRef.current.slice(0, maleReelLenRef.current)) || randOf(malesOf());
      const femaleWinner = randOf(femaleStripRef.current.slice(0, femaleReelLenRef.current)) || randOf(femalesOf());
      pairWinners = { male: maleWinner, female: femaleWinner };
      const fLen = Math.max(1, femaleReelLenRef.current);
      const mLen = Math.max(1, maleReelLenRef.current);
      const fStrip = femaleStripRef.current;
      const mStrip = maleStripRef.current;
      const fIdx = fStrip.findIndex((u) => u.userId === femaleWinner?.userId);
      const mIdx = mStrip.findIndex((u) => u.userId === maleWinner?.userId);
      const fTarget = (((fStrip.length - 1 - fIdx) % fLen) + fLen) % fLen;
      const mTarget = (((mStrip.length - 1 - mIdx) % mLen) + mLen) % mLen;
      nF = stepsTo(fOffsetRef.current, fTarget, fLen) + 1;
      nM = stepsTo(mOffsetRef.current, mTarget, mLen) + 1;
    }
    // 获奖者永远固定在第 8 张：以张为单位减速展示 8 张（第一张立即减速一半 180ms，之后每张比前一张慢 20%，封顶 1.5 秒）。
    // 总行程不足 8 张时补整圈，P 瞬间静默跳过 (总行程-8) 张，展示的 8 张最后一张必然是获奖者
    const MAX_SHOW = 8;
    const travel = (n: number, len: number): number => {
      let t = n;
      const l = Math.max(1, len);
      while (t < MAX_SHOW) t += l;
      return t;
    };
    const durations = Array.from({ length: MAX_SHOW }, (_, i) => Math.min(1500, Math.round(180 * Math.pow(1.2, i))));
    const luckySkips = isLucky ? luckySteps.map((n, i) => travel(n, luckyReelLensRef.current[i]) - MAX_SHOW) : [];
    const skipF = isLucky ? 0 : travel(nF, femaleReelLenRef.current) - MAX_SHOW;
    const skipM = isLucky ? 0 : travel(nM, maleReelLenRef.current) - MAX_SHOW;

    // 跳过部分在 P 瞬间静默完成（禁过渡，滚动快速期不可感知）
    if (isLucky && luckySkips.some((s) => s > 0)) {
      advanceLuckyOffsets((o, i) => o + luckySkips[i]);
    } else if (!isLucky && (skipF > 0 || skipM > 0)) {
      setSnapFrame(true);
      fOffsetRef.current = wrapOffset(femaleReelLenRef.current, fOffsetRef.current + skipF);
      mOffsetRef.current = wrapOffset(maleReelLenRef.current, mOffsetRef.current + skipM);
      setFOffset(fOffsetRef.current);
      setMOffset(mOffsetRef.current);
      setTimeout(() => setSnapFrame(false), 0);
    }

    const inc = (i: number) => {
      if (isLucky) {
        if (i < MAX_SHOW) advanceLuckyOffsets((o) => o + 1);
      } else {
        if (i < MAX_SHOW) {
          fOffsetRef.current = wrapOffset(femaleReelLenRef.current, fOffsetRef.current + 1);
          setFOffset(fOffsetRef.current);
        }
        if (i < MAX_SHOW) {
          mOffsetRef.current = wrapOffset(maleReelLenRef.current, mOffsetRef.current + 1);
          setMOffset(mOffsetRef.current);
        }
      }
    };

    const step = (i: number) => {
      if (i >= MAX_SHOW) {
        // 最后一步滑动完成后进入「越过卡位再回弹停稳」的老虎机手感
        drawTimerRef.current = setTimeout(() => {
          // ① 在当前偏移上越过 0.3 格（不做跨周期坐标跳变，避免倒扫多张卡片）
          setReelSpeed(380);
          if (isLucky) {
            advanceLuckyOffsets((o) => o + 0.3);
          } else {
            fOffsetRef.current += 0.3;
            mOffsetRef.current += 0.3;
            setFOffset(fOffsetRef.current);
            setMOffset(mOffsetRef.current);
          }
          // ② 回弹 0.3 格到精确卡位
          drawTimerRef.current = setTimeout(() => {
            setReelSpeed(520);
            if (isLucky) {
              advanceLuckyOffsets((o) => o - 0.3);
            } else {
              fOffsetRef.current -= 0.3;
              mOffsetRef.current -= 0.3;
              setFOffset(fOffsetRef.current);
              setMOffset(mOffsetRef.current);
            }
            // ③ 回弹完成后再揭晓
            drawTimerRef.current = setTimeout(() => {
              if (isLucky) {
                setDrawWinners(luckyWinners);
              } else {
                setDrawPairWinner(pairWinners);
              }
              setDrawPhase('done');
            }, 560);
          }, 400);
        }, durations[MAX_SHOW - 1] + 60);
        return;
      }
      drawTimerRef.current = setTimeout(() => {
        setReelSpeed(durations[i]);
        inc(i);
        step(i + 1);
      }, durations[i]);
    };
    step(0);
  }, [tab, drawPhase, clearDrawTimer, malesOf, femalesOf, wrapOffset, advanceLuckyOffsets, slowBlock, groupRepGender]);

  /** 编排执行：进入第 idx 步——应用步骤参数并打开对应界面封面（未执行状态）；无效步骤提示跳过（按 → 切换） */
  const runRoutineStep = useCallback((idx: number) => {
    const step = routine[idx];
    if (!step) return;
    routineIdxRef.current = idx;
    setRoutineIdx(idx);
    setRoutineNotice('');
    blockCountRef.current = null;
    blockGenderRef.current = null;
    blockFixedRef.current = null;
    blockFixedDoneRef.current = false;
    groupRepGenderRef.current = null;
    // 分组相关步骤：分组未配置或引用的组已删改 → 提示跳过，不卡住流程
    if (step.type !== 'lucky' && groupsRef.current.length === 0) {
      setRoutineNotice('活动未配置分组，本步已跳过');
      return;
    }
    if (step.type === 'personDraw' && (!step.group || !groupsRef.current.includes(step.group))) {
      setRoutineNotice(`步骤引用的分组「${step.group || ''}」不存在，已跳过`);
      return;
    }
    if (step.type === 'lucky') {
      startLucky({ count: step.count ?? 1, gender: step.gender ?? 'mix' });
    } else if (step.type === 'groupRep') {
      startGroupRep({ gender: step.gender ?? 'mix' });
    } else if (step.type === 'groupDraw') {
      if (step.fixed && step.fixed.length) {
        // 指定结果：校验指定分组仍存在，无效则跳过本步
        const missing = step.fixed.filter((g) => !groupsRef.current.includes(g));
        if (missing.length) {
          setRoutineNotice(`步骤指定的分组「${missing.join('、')}」不存在，已跳过`);
          return;
        }
        blockFixedRef.current = [...step.fixed];
      } else {
        blockCountRef.current = step.count ?? 1;
      }
      startBlockDraw('group');
    } else {
      blockCountRef.current = step.count ?? 1;
      blockGenderRef.current = step.gender ?? 'mix';
      startBlockDraw('person', { group: step.group });
    }
  }, [routine, startLucky, startGroupRep, startBlockDraw]);

  /** 按 9 进入编排执行模式：从第 1 步开始 */
  const enterRoutine = useCallback(() => {
    clearDrawTimer();
    routineModeRef.current = true;
    setRoutineMode(true);
    runRoutineStep(0);
  }, [clearDrawTimer, runRoutineStep]);

  /** 退出编排执行模式（9/Esc）：回到嘉宾展示墙自由操作 */
  const exitRoutine = useCallback(() => {
    clearDrawTimer();
    routineModeRef.current = false;
    setRoutineMode(false);
    setRoutineNotice('');
    blockCountRef.current = null;
    blockGenderRef.current = null;
    blockFixedRef.current = null;
    blockFixedDoneRef.current = false;
    groupRepGenderRef.current = null;
    switchTab('list');
  }, [clearDrawTimer, switchTab]);

  // 键盘切换（每次按键先查询对应数据）：0 演示 / 1 嘉宾展示 / 2 心动互选 / 3 我钟意你 / 4 幸运之星 / 5 默契度 / 6 各组代表 / 7 组中抽组 / 8 单组选人 / ↓↑ 切换配对 / o 开始滚动 / p 减速停下 / 9 编排执行（O 开始、P 停止、R 重抽、←→ 切换步骤、Esc 退出）
  // 能成时刻入口已隐藏（2026-11-03，功能保留）：恢复时把 4 改回 startCouple 并在工具区加回按钮
  useEffect(() => {
    const onkey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // 配置下拉框打开/聚焦期间不响应快捷键；若焦点残留在面板下拉框上（选中后未失焦），先失焦再忽略本次按键
      if ((e.target as HTMLElement | null)?.closest('.ant-select, .ant-select-dropdown')) {
        const el = document.activeElement as HTMLElement | null;
        if (el?.closest('.ant-select')) el.blur();
        return;
      }
      // 编排执行模式：模式键 0-8 失效，O 开始、P 停止、R 重抽、←/→ 切换步骤、9/Esc 退出（与自由模式按键一致）
      if (routineModeRef.current) {
        if (e.key === '9' || e.key === 'Escape') exitRoutine();
        else if (e.key === 'o' || e.key === 'O') beginRoll();
        else if (e.key === 'p' || e.key === 'P') slowRoll();
        else if (e.key === 'r' || e.key === 'R') runRoutineStep(routineIdxRef.current);
        else if (e.key === 'ArrowLeft') runRoutineStep(Math.max(0, routineIdxRef.current - 1));
        else if (e.key === 'ArrowRight') runRoutineStep(Math.min(routine.length - 1, routineIdxRef.current + 1));
        return;
      }
      if (e.key === '9') {
        if (routine.length > 0) enterRoutine();
      } else if (e.key === '0') toggleDemo();
      else if (e.key === '1') switchTab('list');
      else if (e.key === '2') enterHeartTab('feeling');
      else if (e.key === '3') enterHeartTab('likeMe');
      else if (e.key === '4') startLucky();
      else if (e.key === '5') startCpRank();
      else if (e.key === '6') startGroupRep();
      else if (e.key === '7') startBlockDraw('group');
      else if (e.key === '8') startBlockDraw('person');
      else if (e.key === 'o' || e.key === 'O') beginRoll();
      else if (e.key === 'p' || e.key === 'P') slowRoll();
      else if (e.key === 'ArrowDown') showNextHeart();
      else if (e.key === 'ArrowUp') showPrevHeart();
    };
    window.addEventListener('keydown', onkey);
    return () => window.removeEventListener('keydown', onkey);
  }, [routine, toggleDemo, switchTab, enterHeartTab, startLucky, startCpRank, startGroupRep, startBlockDraw, beginRoll, slowRoll, showNextHeart, showPrevHeart, enterRoutine, exitRoutine, runRoutineStep]);

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

  /**
   * 幸运之星/各组代表转轮排版规则：转轮宽度自适应（单个 18vw），
   * 每行最多容纳 5 个（宽度低于 12vw 即换行），多行居中；卡片保持 3:4。
   */
  const LUCKY_PER_ROW = 5;
  const luckyReelW = Math.min(18, (80 - (Math.min(luckyStrips.length, LUCKY_PER_ROW) - 1) * 1.5) / Math.min(luckyStrips.length, LUCKY_PER_ROW));
  const luckyReelH = (luckyReelW * 4) / 3;

  /** 编排模式当前步骤参数（驱动封面人数/组名等展示；自由模式沿用右上角配置） */
  const routineStepNow = routineMode && routine[routineIdx] ? routine[routineIdx] : null;
  const effLuckyCount = routineStepNow?.type === 'lucky' ? (routineStepNow.count ?? 1) : luckyCount;
  const effLuckyGender = routineStepNow?.type === 'lucky' ? (routineStepNow.gender ?? 'mix') : luckyGender;
  // 组中选组指定结果时抽组数=所选中组数（进度条/封面不泄露具体组名）
  const effGroupDrawCount = routineStepNow?.type === 'groupDraw'
    ? (routineStepNow.fixed?.length ?? routineStepNow.count ?? 1)
    : groupDrawCount;
  const effPersonDrawCount = routineStepNow?.type === 'personDraw' ? (routineStepNow.count ?? 1) : personDrawCount;

  /** 幸运之星封面：实际可建转轮数（与 buildLuckyPools 同一算法，避免两处规则漂移） */
  const luckyReelCount = tab === 'lucky' ? buildLuckyPools(wall, effLuckyCount, effLuckyGender).length : 0;
  /**
   * 封面人数不足提示（性别筛选后符合条件人数 < 所选人数时自动缩减转轮数）。
   * 措辞不带性别——性别要求只控制落定结果，大屏展示不能让观众看出要求。
   */
  const luckyHint = (() => {
    if (tab !== 'lucky' || luckyReelCount >= effLuckyCount) return '';
    if (!luckyReelCount) return effLuckyGender === 'any' ? '暂无签到嘉宾' : '暂无符合条件的嘉宾，无法抽取';
    return effLuckyGender === 'any'
      ? `现场嘉宾仅 ${luckyReelCount} 人，按 ${luckyReelCount} 人抽取`
      : `符合条件嘉宾仅 ${luckyReelCount} 人，按 ${luckyReelCount} 人抽取`;
  })();

  /**
   * 心动排名左右心形：全部签到嘉宾按性别分组（含分组名）。
   * 容器为竖长半屏，纵向压缩（top 向中线收拢 50%）让堆叠更像心形比例。
   */
  const compressHeart = (items: WallItem[]): WallItem[] =>
    items.map((p) => ({ ...p, top: 50 + (p.top - 50) * 0.5 }));
  const heartMaleItems = compressHeart(buildWallItems(wall.filter((u) => u.gender === 'male'), 9));
  const heartFemaleItems = compressHeart(buildWallItems(wall.filter((u) => u.gender === 'female'), 9));

  /** 单组选人：指定组的已签到成员数（配置人数上限）；编排模式取步骤指定组 */
  const personGroupName = (routineStepNow?.type === 'personDraw' && routineStepNow.group ? routineStepNow.group : personGroup) || groupsRef.current[0] || '';

  /** 操作提示（右上角面板底部）：原界面上的按键提示统一收拢于此，随界面状态变化 */
  const freeHint = (() => {
    if (tab === 'lucky' || tab === 'groupRep' || tab === 'couple') {
      if (drawPhase === 'cover') return '按 O 开始 · 按 P 停止';
      if (tab === 'couple' && drawPhase === 'done') return '按 4 重新开始';
      return '';
    }
    if (tab === 'groupDraw' || tab === 'personDraw') {
      if (blockPhase === 'cover') {
        return blockDrawnKeys.length > 0 ? '按 O 开始 · 按 P 停止 · 按 O 继续下一轮' : '按 O 开始 · 按 P 停止';
      }
      if (blockPhase === 'done') {
        return blockCandidatesRef.current.length ? '按 O 继续下一轮 · 按 7/8 重新开始' : '已全部抽出 · 按 7/8 重新开始';
      }
      return '';
    }
    if (tab === 'feeling' || tab === 'likeMe') return '↓ 下一对 · ↑ 上一对';
    return '';
  })();
  const personCountOptions = Array.from(
    { length: Math.min(26, Math.max(1, wall.filter((u) => u.group === personGroupName).length)) },
    (_, i) => i + 1,
  );

  const wallItems = buildWallItems(wall);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: bgScreen
          ? (bgMode === 'stretch'
            ? `url(${bgScreen}) center / 100% 100% no-repeat`
            : bgMode === 'contain'
              ? `#000 url(${bgScreen}) center / contain no-repeat`
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

      {/* 右上角工作区：鼠标悬停显示，移走隐藏；面板内下拉框展开时保持显示（下拉属于面板的一部分） */}
      <div className={`onsite-tools${toolSelectOpen ? ' tools-open' : ''}`}>
        {routineMode ? (
          <div style={{ background: 'rgba(0,0,0,.55)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, whiteSpace: 'nowrap' }}>
            <button onClick={exitRoutine} style={toolBtn}>退出编排</button>
            <div style={{ color: '#ffd700' }}>
              操作提示：
              {routineStepNow?.type === 'groupDraw' && routineStepNow.fixed?.length && blockPhase === 'done'
                ? '指定结果已揭晓 · 按 → 进入下一步'
                : 'O 开始 · P 停止 · R 重抽本步 · ←/→ 切换步骤 · 9 退出'}
            </div>
          </div>
        ) : (
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
              <button onClick={() => setBgMode('contain')} style={bgMode === 'contain' ? toolBtnActive : toolBtn}>等比完整</button>
            </div>
          )}
          {/* 界面切换（按钮注明快捷键）；能成时刻入口已隐藏（2026-11-03），功能保留：恢复时加回「能成时刻(4)」按钮并把键盘 4 改回 startCouple */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ alignSelf: 'flex-start', marginRight: 4, lineHeight: '26px' }}>界面切换</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 6 }}>
              <button onClick={() => switchTab('list')} style={tab === 'list' ? toolBtnActive : toolBtn}>嘉宾展示(1)</button>
              <button onClick={() => enterHeartTab('feeling')} style={tab === 'feeling' ? toolBtnActive : toolBtn}>心动互选(2)</button>
              <button onClick={() => enterHeartTab('likeMe')} style={tab === 'likeMe' ? toolBtnActive : toolBtn}>我钟意你(3)</button>
              <button onClick={() => startLucky()} style={tab === 'lucky' ? toolBtnActive : toolBtn}>幸运之星(4)</button>
              <button onClick={startCpRank} style={tab === 'cpRank' ? toolBtnActive : toolBtn}>默契度排名(5)</button>
              <button onClick={toggleDemo} style={demo ? toolBtnActive : toolBtn}>演示模式(0)</button>
              {/* 分组抽取功能：仅活动已配置分组时显示 */}
              {hasGroups && (
                <>
                  <button onClick={() => startGroupRep()} style={tab === 'groupRep' ? toolBtnActive : toolBtn}>各组代表(6)</button>
                  <button onClick={() => startBlockDraw('group')} style={tab === 'groupDraw' ? toolBtnActive : toolBtn}>组中抽组(7)</button>
                  <button onClick={() => startBlockDraw('person')} style={tab === 'personDraw' ? toolBtnActive : toolBtn}>单组选人(8)</button>
                </>
              )}
              {/* 流程编排入口：仅活动已保存编排步骤时显示，按 9 进入编排执行模式 */}
              {routine.length > 0 && (
                <button onClick={enterRoutine} style={toolBtn}>流程编排(9)</button>
              )}
            </div>
          </div>
          {/* 幸运之星配置（仅幸运之星界面显示） */}
          {tab === 'lucky' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 4 }}>幸运之星</span>
              <span>人数</span>
              <Select
                size="small"
                value={luckyCount}
                onChange={blurAfter((v: number) => setLuckyCount(v))}
                onDropdownVisibleChange={(open: boolean) => setToolSelectOpen(open)}
                style={{ width: 62 }}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
              />
              <span>性别</span>
              <Select
                size="small"
                value={luckyGender}
                onChange={blurAfter((v: LuckyGender) => setLuckyGender(v))}
                onDropdownVisibleChange={(open: boolean) => setToolSelectOpen(open)}
                style={{ width: 78 }}
                options={LUCKY_GENDER_OPTIONS}
              />
            </div>
          )}
          {/* 各组代表配置（仅该界面显示）：性别要求（默认混搭） */}
          {tab === 'groupRep' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 4 }}>性别</span>
              <Select
                size="small"
                value={groupRepGender}
                onChange={blurAfter((v: LuckyGender) => setGroupRepGender(v))}
                onDropdownVisibleChange={(open: boolean) => setToolSelectOpen(open)}
                style={{ width: 78 }}
                options={LUCKY_GENDER_OPTIONS}
              />
            </div>
          )}
          {/* 组中抽组配置（仅该界面显示）：每轮抽取组数 */}
          {tab === 'groupDraw' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 4 }}>抽取组数</span>
              <Select
                size="small"
                value={groupDrawCount}
                onChange={blurAfter((v: number) => setGroupDrawCount(v))}
                onDropdownVisibleChange={(open: boolean) => setToolSelectOpen(open)}
                style={{ width: 62 }}
                options={groupsRef.current.map((_, i) => ({ value: i + 1, label: String(i + 1) }))}
              />
            </div>
          )}
          {/* 单组选人配置（仅该界面显示）：指定组 + 每轮抽取人数 */}
          {tab === 'personDraw' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 4 }}>指定组</span>
              <Select
                size="small"
                value={personGroup || groupsRef.current[0]}
                onChange={blurAfter((v: string) => setPersonGroup(v))}
                onDropdownVisibleChange={(open: boolean) => setToolSelectOpen(open)}
                style={{ width: 88 }}
                options={groupsRef.current.map((g) => ({ value: g, label: `${g}组` }))}
              />
              <span>抽取人数</span>
              <Select
                size="small"
                value={personDrawCount}
                onChange={blurAfter((v: number) => setPersonDrawCount(v))}
                onDropdownVisibleChange={(open: boolean) => setToolSelectOpen(open)}
                style={{ width: 62 }}
                options={personCountOptions.map((n) => ({ value: n, label: String(n) }))}
              />
              <span>性别</span>
              <Select
                size="small"
                value={personGender}
                onChange={blurAfter((v: LuckyGender) => setPersonGender(v))}
                onDropdownVisibleChange={(open: boolean) => setToolSelectOpen(open)}
                style={{ width: 78 }}
                options={LUCKY_GENDER_OPTIONS}
              />
            </div>
          )}
          {/* 用户切换（心动互选/我钟意你界面显示） */}
          {(tab === 'feeling' || tab === 'likeMe') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 4 }}>用户切换</span>
              <button onClick={() => showNextHeart()} style={toolBtn}>下一对↓</button>
              <button onClick={() => showPrevHeart()} style={toolBtn}>上一对↑</button>
            </div>
          )}
          {/* 展示形式（仅嘉宾展示界面显示）：爱心放大=心形照片墙 电影播放=中央聚焦+底部胶片 */}
          {tab === 'list' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ marginRight: 4 }}>展示形式</span>
              <button onClick={() => setWallMode('heart')} style={wallMode === 'heart' ? toolBtnActive : toolBtn}>爱心放大</button>
              <button onClick={() => setWallMode('spotlight')} style={wallMode === 'spotlight' ? toolBtnActive : toolBtn}>电影播放</button>
            </div>
          )}
          {/* 操作提示：原界面上的按键提示统一收拢于此（随界面状态变化） */}
          {freeHint && <div style={{ color: '#ffd700' }}>操作提示：{freeHint}</div>}
        </div>
        )}
      </div>

      {/* 编排执行进度（编排模式常显）：仅步骤序号 + 流程简介（备注），操作提示在右上角隐藏区域 */}
      {routineMode && routine[routineIdx] && (
        <div style={{ position: 'absolute', top: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 6, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,.62)', borderRadius: 22, padding: '7px 20px', color: '#fff', fontSize: '2.4vh', display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>第 {routineIdx + 1}/{routine.length} 步</span>
            {routine[routineIdx].note && <span>{routine[routineIdx].note}</span>}
          </div>
        </div>
      )}

      {/* 编排跳过提示横幅 */}
      {routineNotice && (
        <div style={{ position: 'absolute', top: '11vh', left: 0, right: 0, textAlign: 'center', zIndex: 6, pointerEvents: 'none' }}>
          <span style={{ display: 'inline-block', background: 'rgba(224,77,44,.9)', color: '#fff', padding: '8px 26px', borderRadius: 26, fontSize: '3vh', fontWeight: 600 }}>
            {routineNotice}
          </span>
        </div>
      )}

      {/* 内容区 */}
      <div style={{ height: '100vh', transform: `scaleX(${scale})`, transformOrigin: 'center top' }}>
        {tab === 'lucky' || tab === 'groupRep' ? (
          /* ====== 幸运之星（4）/ 各组代表（6）：并排转轮随机抽 N 人（照片自上而下滚动，首尾相连，获奖者不重复） ====== */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5vh' }}>
            {drawPhase === 'cover' ? (
              <>
                <div className="draw-cover-title">{tab === 'lucky' ? '幸运之星' : '各组代表'}</div>
                {tab === 'lucky' && luckyReelCount > 0 && (
                  <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '3vh' }}>
                    从现场嘉宾中随机抽取 {luckyReelCount} 位幸运之星
                  </div>
                )}
                {tab === 'lucky' && luckyHint && <div style={{ color: '#ffd700', fontSize: '2.8vh' }}>{luckyHint}</div>}
              </>
            ) : (
              <>
                {luckyStrips.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5vw', maxWidth: '80vw', justifyContent: 'center' }}>
                    {luckyStrips.map((strip, i) => (
                      <div key={i} className={`draw-reel-frame lucky${drawPhase === 'done' ? ' win' : ''}`} style={{ width: `${luckyReelW}vw` }}>
                        <div className="draw-reel-window" style={{ height: `${luckyReelH}vw` }}>
                          <div className="draw-reel-strip" style={{ transform: `translateY(calc(${luckyReelH}vw * (${luckyOffsets[i]} - ${strip.length} + 1)))`, transition: luckySnaps[i] ? 'none' : `transform ${reelSpeed}ms linear` }}>
                            {strip.map((u, j) => (
                              <div key={`${u.userId}-${j}`} className="draw-reel-item" style={{ height: `${luckyReelH}vw` }}>
                                <img src={u.photo} alt={u.nick} />
                                <span className="draw-nick">
                                  <span className={`onsite-number-inline gender-${u.gender}`}>{u.number || '-'}</span>
                                  {u.nick}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {drawPhase === 'done' && tab === 'lucky' && drawWinners.length > 0 && (
                  <div style={{ color: '#ffd700', fontWeight: 'bold', textShadow: '0 2px 12px rgba(0,0,0,.5)', textAlign: 'center', padding: '0 6vw', fontSize: drawWinners.length === 1 ? '4.5vh' : '3.4vh', lineHeight: 1.6 }}>
                    {drawWinners.length === 1
                      ? <>恭喜 {drawWinners[0].number || ''} 号 {drawWinners[0].nick}</>
                      : <>恭喜 {drawWinners.length} 位幸运之星：{drawWinners.map((w) => `${w.number || ''}号 ${w.nick}`).join('、')}</>}
                  </div>
                )}
              </>
            )}
          </div>
        ) : tab === 'groupDraw' || tab === 'personDraw' ? (
          /* ====== 组中抽组（7）/ 单组选人（8）：方块/卡片高亮轮扫，P 减速逐格锁定，已锁定的跳过、排序保持不变 ====== */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4vh' }}>
            {blockPhase === 'cover' ? (
              <>
                <div className="draw-cover-title">{tab === 'groupDraw' ? '组中抽组' : '单组选人'}</div>
                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '2.8vh' }}>
                  {tab === 'groupDraw'
                    ? `共 ${blockAll.length} 组 · 每轮抽取 ${effGroupDrawCount} 组`
                    : `「${personGroupName}」组 · 每轮抽取 ${effPersonDrawCount} 人`}
                </div>
              </>
            ) : (
              <>
                <div className="draw-cover-title" style={{ fontSize: '4.5vh' }}>{tab === 'groupDraw' ? '组中抽组' : '单组选人'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2vw 2.6vw', maxWidth: '84vw', justifyContent: 'center' }}>
                  {/* 原始顺序展示：本轮定格金色、更早已抽带蒙版、滚动高亮去蒙版 */}
                  {blockAll.map((b) => {
                    const isWin = blockRoundWinners.includes(b.key);
                    const isDrawn = !isWin && blockDrawnKeys.includes(b.key);
                    const isBright = blockPhase !== 'done' && blockBright.has(b.key);
                    return (
                      <BlockCard
                        key={b.key}
                        item={b}
                        state={isWin ? 'win' : isDrawn ? 'drawn' : isBright ? 'bright' : 'normal'}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : tab === 'couple' ? (
          /* ====== 能成时刻：双转轮随机抽一对（左女右男）——入口已隐藏（2026-11-03，功能保留），恢复时加回键盘 4 与工具按钮 ====== */
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5vh' }}>
            {drawPhase === 'cover' ? (
              <>
                <div className="draw-cover-title">能成时刻</div>
                <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '3vh' }}>从现场嘉宾中随机抽取一对幸运组合</div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '8vw' }}>
                  {/* 女方转轮 */}
                  {femaleStrip.length > 0 && (
                    <div className={`draw-reel-frame couple${drawPhase === 'done' ? ' win' : ''}`}>
                      <div className="draw-reel-window">
                        <div className="draw-reel-strip" style={{ transform: `translateY(calc(20vw * (${fOffset} - ${femaleStrip.length} + 1)))`, transition: snapFrame ? 'none' : `transform ${reelSpeed}ms linear` }}>
                          {femaleStrip.map((u, i) => (
                            <div key={`f-${u.userId}-${i}`} className="draw-reel-item">
                              <img src={u.photo} alt={u.nick} />
                              <span className="draw-nick">
                                <span className="onsite-number-inline gender-female">{u.number || '-'}</span>
                                {u.nick}
                              </span>
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
                        <div className="draw-reel-strip" style={{ transform: `translateY(calc(20vw * (${mOffset} - ${maleStrip.length} + 1)))`, transition: snapFrame ? 'none' : `transform ${reelSpeed}ms linear` }}>
                          {maleStrip.map((u, i) => (
                            <div key={`m-${u.userId}-${i}`} className="draw-reel-item">
                              <img src={u.photo} alt={u.nick} />
                              <span className="draw-nick">
                                <span className="onsite-number-inline gender-male">{u.number || '-'}</span>
                                {u.nick}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {drawPhase === 'done' && drawPairWinner && (
                  <div style={{ color: '#ffd700', fontSize: '4.5vh', fontWeight: 'bold', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
                    恭喜 {drawPairWinner.female?.nick} × {drawPairWinner.male?.nick}
                  </div>
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
                      <div style={{ position: 'relative', display: 'inline-block', height: '100%' }}>
                        <img src={current.photo} alt={current.nick} style={{ height: '100%', maxWidth: '46vw', borderRadius: '1.3vh', border: 'solid 2px rgba(255,255,255,.6)', boxShadow: '0 8px 30px rgba(0,0,0,.4)', display: 'block' }} />
                        <span className="onsite-nick" style={{ fontSize: '3vh', fontWeight: 'bold', padding: '.3em .6em', borderRadius: '0 0 1.3vh 1.3vh' }}>
                          <span className={`onsite-number-inline gender-${current.gender}`}>{current.number || '-'}</span>
                          {current.nick}
                        </span>
                      </div>
                    </div>
                  )}
                  {next && (
                    <div key={`next-${next.userId}-${next.number}`} style={{ position: 'absolute', inset: 0, textAlign: 'center', height: '100%', opacity: crossing ? 1 : 0, transition: 'opacity .5s ease' }}>
                      <div style={{ position: 'relative', display: 'inline-block', height: '100%' }}>
                        <img src={next.photo} alt={next.nick} style={{ height: '100%', maxWidth: '46vw', borderRadius: '1.3vh', border: 'solid 2px rgba(255,255,255,.6)', boxShadow: '0 8px 30px rgba(0,0,0,.4)', display: 'block' }} />
                        <span className="onsite-nick" style={{ fontSize: '3vh', fontWeight: 'bold', padding: '.3em .6em', borderRadius: '0 0 1.3vh 1.3vh' }}>
                          <span className={`onsite-number-inline gender-${next.gender}`}>{next.number || '-'}</span>
                          {next.nick}
                        </span>
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
                  <img src={p.photo} alt={p.nick} onLoad={clampWall} />
                  <span className="onsite-nick">
                    <span className={`onsite-number-inline gender-${p.gender}`}>{p.number || '-'}</span>
                    {p.nick}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : tab === 'cpRank' ? (
          /* ====== 默契度排名（5）：已完成答题的CP组合按默契度差异正序排名（左男右女带现场序号，中间默契度分数） ====== */
          <div style={{ height: '100%', overflowY: 'auto', padding: '5vh 6vw 10vh' }}>
            <div className="draw-cover-title" style={{ textAlign: 'center', marginBottom: '4vh' }}>默契度排名</div>
            {cpRanks.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '4vh', color: 'rgba(255,255,255,.5)' }}>暂无已完成答题的CP组合</div>
            ) : (
              cpRanks.map((c, i) => {
                const male = rankUserOf(c.male);
                const female = rankUserOf(c.female);
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '2vw', background: 'rgba(0,0,0,.35)', borderRadius: '1.3vh', padding: '1.8vh 2.5vw', marginBottom: '1.5vh' }}>
                    <RankSide nick={male.nick} photo={male.photo} gender={male.gender} number={male.number} />
                    <div style={{ textAlign: 'center', minWidth: '11vw', flexShrink: 0 }}>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '2.4vh' }}>第 {i + 1} 名</div>
                      <div style={{ fontSize: '5vh', color: '#ffd700', fontWeight: 'bold', lineHeight: 1.2 }}>{c.diff_total != null ? 100 - c.diff_total : '—'}</div>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '2.2vh' }}>默契度</div>
                    </div>
                    <RankSide nick={female.nick} photo={female.photo} gender={female.gender} number={female.number} right />
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ====== 心动排名（2）：左男右女双心形，中间互相心动次数；↓ 下一对 / ↑ 上一对 ====== */
          <div style={{ height: '100%', display: 'flex' }}>
            {/* 左：男生心形 */}
            <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
              {heartMaleItems.map((p) => {
                const isActive = !!heartCurrent && p.userId === heartCurrent.male?.user?.user_id;
                return (
                  <div
                    key={p.userId}
                    data-rot={p.rotate}
                    className={`onsite-photo${isActive ? ' heart-active' : ''}`}
                    style={{
                      left: isActive ? '50%' : `${p.left}%`,
                      top: isActive ? '50%' : `${p.top}%`,
                      width: isActive ? '32vw' : `${p.size}vw`,
                      zIndex: isActive ? 60 : p.z,
                      transform: `translate(-50%,-50%) rotate(${isActive ? 0 : p.rotate}deg)`,
                    }}
                  >
                    <img src={p.photo} alt={p.nick} />
                    <span className="onsite-nick">
                      <span className="onsite-number-inline gender-male">{p.number || '-'}</span>
                      {p.nick}
                    </span>
                  </div>
                );
              })}
              {heartMaleItems.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.4)', fontSize: '3vh' }}>暂无男嘉宾</div>
              )}
            </div>

            {/* 中：双方心动次数（桃心形式：粉=女方发起、蓝=男方发起） */}
            <div style={{ width: '14vw', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {heartCurrent ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '2.5vh', color: '#ff5b8f' }}>
                    {Array.from({ length: Math.min(heartCurrent.female_loves_count ?? 0, 3) }).map((_, i) => <HeartFilled key={`hf${i}`} style={{ width: '3vw', fontSize: '3vw' }} />)}
                  </div>
                  <div style={{ color: '#4da3ff' }}>
                    {Array.from({ length: Math.min(heartCurrent.male_loves_count ?? 0, 3) }).map((_, i) => <HeartFilled key={`hm${i}`} style={{ width: '3vw', fontSize: '3vw' }} />)}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '2.6vh', textAlign: 'center' }}>
                  {heartNoMore ? '暂无更多互相心动的CP' : null}
                </div>
              )}
            </div>

            {/* 右：女生心形 */}
            <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
              {heartFemaleItems.map((p) => {
                const isActive = !!heartCurrent && p.userId === heartCurrent.female?.user?.user_id;
                return (
                  <div
                    key={p.userId}
                    data-rot={p.rotate}
                    className={`onsite-photo${isActive ? ' heart-active' : ''}`}
                    style={{
                      left: isActive ? '50%' : `${p.left}%`,
                      top: isActive ? '50%' : `${p.top}%`,
                      width: isActive ? '32vw' : `${p.size}vw`,
                      zIndex: isActive ? 60 : p.z,
                      transform: `translate(-50%,-50%) rotate(${isActive ? 0 : p.rotate}deg)`,
                    }}
                  >
                    <img src={p.photo} alt={p.nick} />
                    <span className="onsite-nick">
                      <span className="onsite-number-inline gender-female">{p.number || '-'}</span>
                      {p.nick}
                    </span>
                  </div>
                );
              })}
              {heartFemaleItems.length === 0 && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.4)', fontSize: '3vh' }}>暂无女嘉宾</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 照片墙样式（移植自旧系统 activscreen） */}
      <style>{`
        .onsite-tools { position: fixed; top: 0; right: 0; width: 430px; z-index: 100; opacity: 0; transition: opacity .3s; display: flex; align-items: flex-start; justify-content: flex-end; padding: 10px 14px; }
        .onsite-tools:hover, .onsite-tools.tools-open { opacity: 1; }
        .onsite-photo { position: absolute; transition: transform .5s, opacity .5s, left .5s ease, top .5s ease, width .5s ease; opacity: .85; }
        .onsite-photo img { width: 100%; height: auto; display: block; border-radius: 1.3vh; border: solid 2px rgba(255,255,255,.6); box-shadow: 0 3px 8px rgba(0,0,0,.35); }
        .onsite-photo.focus { transform: translate(calc(-50% + var(--fx,0px)), calc(-50% + var(--fy,0px))) scale(var(--fscale,2)) rotate(0deg) !important; opacity: 1; }
        .onsite-photo.focus img { border-color: #e04d2c; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
        /* 心动排名：当前配对的心形卡片（居中放大由行内样式控制）；文字行与徽章等比例放大 2 倍 */
        .onsite-photo.heart-active { opacity: 1; }
        .onsite-photo.heart-active img { border-color: #e04d2c; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
        .onsite-photo.heart-active .onsite-nick { font-size: 2.2vw; padding: .3em .6em; }
        .onsite-number { position: absolute; left: 5%; top: 4%; min-width: 2.4vw; height: 2.4vw; padding: 0 .4vw; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #e04d2c; color: #fff; font-size: 1.2vw; font-weight: bold; line-height: 1; white-space: nowrap; z-index: 2; }
        .onsite-number.gender-male { background: #0088cc; }
        .onsite-number.gender-female { background: #eb5482; }
        /* 全站用户卡片统一：序号贴内联在昵称行前（em 比例随卡片整体大小等比缩放） */
        .onsite-number-inline { display: inline-flex; align-items: center; justify-content: center; min-width: 1.35em; height: 1.35em; padding: 0 .3em; box-sizing: border-box; border-radius: 50%; background: #e04d2c; color: #fff; font-size: 1em; font-weight: bold; line-height: 1; vertical-align: middle; position: relative; top: -0.12em; margin-right: .45em; white-space: nowrap; }
        .onsite-number-inline.gender-male { background: #0088cc; }
        .onsite-number-inline.gender-female { background: #eb5482; }
        .onsite-nick { position: absolute; left: 0; right: 0; bottom: 0; padding: .3em .5em; text-align: center; background: rgba(0,0,0,.45); color: #fff; font-size: 1.1vw; border-radius: 0 0 1.3vh 1.3vh; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
        .draw-nick { position: absolute; left: 0; right: 0; bottom: 0; padding: .3em .5em; text-align: center; background: rgba(0,0,0,.5); color: #fff; font-size: 1.6vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .draw-reel-frame.win { border-color: #ffd700; box-shadow: 0 0 50px rgba(255,215,0,.8); }
      `}</style>
    </div>
  );
};

export default ActivityOnsite;
