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
  const [tab, setTab] = useState<'list' | 'feeling'>('list');
  const [scale, setScale] = useState(1);
  const [wall, setWall] = useState<WallUser[]>([]);
  const [couples, setCouples] = useState<OnsiteCouple[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const [demo, setDemo] = useState(false);
  const demoRef = useRef(false);
  /** 用户照片缓存（脱单照片优先，缺失回退头像）；批量补拉后靠 setState 重建触发重渲染 */
  const photoMapRef = useRef<Map<string, string>>(new Map());

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
      setWall(base);
      await upgradePhotos(base.map((u) => u.userId));
      // 用拉取到的照片重建
      setWall(base.map((u) => ({ ...u, photo: photoMapRef.current.get(u.userId) || u.photo })));
    } catch { /* 轮询静默 */ }
  }, [id, upgradePhotos]);

  /** 现场配对数据（双方入选+签到，按匹配度倒序） */
  const fetchCouples = useCallback(async () => {
    if (!id) return;
    try {
      const all: OnsiteCouple[] = [];
      let page = 1;
      while (true) {
        const res: any = await activityApi.getOnsiteCouples(id, { page, size: 100 });
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
      fetchWall();
      fetchCouples();
      return;
    }
    try {
      const res: any = await userApi.getUsers({ page: 1, size: 100 });
      const list: any[] = Array.isArray(res) ? res : (res?.list || []);
      const shuffled = [...list].sort(() => Math.random() - 0.5).slice(0, 50);
      const females = shuffled.filter((u) => u?.profile?.gender === 2);
      const males = shuffled.filter((u) => u?.profile?.gender === 1);
      const others = shuffled.filter((u) => u?.profile?.gender !== 1 && u?.profile?.gender !== 2);
      // 其余性别未知的用户交替补入男女，保证演示性别均衡
      others.forEach((u, i) => (i % 2 === 0 ? males : females).push(u));
      const toWall = (list2: any[], offset: number, gender: 'male' | 'female'): WallUser[] =>
        list2.map((u, i) => ({
          number: i + 1,
          nick: u?.profile?.nickname || `嘉宾${offset + i + 1}`,
          gender,
          userId: `demo-${gender}-${i}`,
          photo: u?.match_profile?.photos?.[0] || u?.profile?.avatar || demoAvatar(offset + i, gender),
        }));
      const demoWall: WallUser[] = [
        ...toWall(females, 0, 'female'),
        ...toWall(males, females.length, 'male'),
      ];
      setWall(demoWall);
      // 演示配对：男女顺序两两配对，随机心形计数
      const demoCouples: OnsiteCouple[] = [];
      for (let i = 0; i < females.length && i < males.length; i++) {
        const f = demoWall[i];
        const m = demoWall[females.length + i];
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

  // 聚焦动画：逐张放大高亮停留 2 秒，无限循环
  useEffect(() => {
    if (tab !== 'list') return;
    if (!wall.length) return;
    setFocusIdx(0);
    const timer = setInterval(() => {
      setFocusIdx((prev) => (prev + 1) % Math.max(wall.length, 1));
    }, 2000);
    return () => clearInterval(timer);
  }, [tab, wall]);

  // 键盘切换：0 演示模式 / 1 嘉宾一览 / 2 匹配嘉宾
  useEffect(() => {
    const onkey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === '0') toggleDemo();
      else if (e.key === '1') setTab('list');
      else if (e.key === '2') setTab('feeling');
    };
    window.addEventListener('keydown', onkey);
    return () => window.removeEventListener('keydown', onkey);
  }, [toggleDemo]);

  const applyScale = (delta: number) => {
    setScale((prev) => Math.min(1.25, Math.max(0.2, Math.round((prev + delta) * 100) / 100)));
  };

  const wallItems = buildWallItems(wall);

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'linear-gradient(160deg,#2b0a3d 0%,#4a1030 45%,#7a1a2e 100%)', overflow: 'hidden', position: 'relative', fontFamily: 'inherit' }}>
      {/* 演示模式徽章（仅演示时显示） */}
      {demo && (
        <div style={{ position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', zIndex: 5 }}>
          <span style={{ padding: '2px 10px', borderRadius: 10, background: '#e04d2c', color: '#fff', fontSize: 13 }}>演示模式</span>
        </div>
      )}

      {/* 右上角缩放工具：默认隐藏，鼠标移到右上角显示 */}
      <div className="onsite-tools">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => applyScale(-0.05)} style={{ background: 'rgba(0,0,0,.5)', color: '#fff', border: 'none', borderRadius: 6, width: 34, height: 30, cursor: 'pointer' }}>－</button>
          <span style={{ color: '#fff', minWidth: 52, textAlign: 'center', fontWeight: 'bold' }}>{Math.round(scale * 100)}%</span>
          <button onClick={() => applyScale(0.05)} style={{ background: 'rgba(0,0,0,.5)', color: '#fff', border: 'none', borderRadius: 6, width: 34, height: 30, cursor: 'pointer' }}>＋</button>
        </div>
      </div>

      {/* 右下角操作提示 */}
      <div style={{ position: 'absolute', bottom: 16, right: 18, zIndex: 5, color: 'rgba(255,255,255,.35)', fontSize: 12 }}>
        键盘 1/2 切换 · 0 演示模式
      </div>

      {/* 内容区 */}
      <div style={{ height: '100vh', transform: `scaleX(${scale})`, transformOrigin: 'center top' }}>
        {tab === 'list' ? (
          wallItems.length === 0 ? (
            <div style={{ paddingTop: '30vh', textAlign: 'center', fontSize: '4vh', color: 'rgba(255,255,255,.5)' }}>暂无签到嘉宾</div>
          ) : (
            <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
              {wallItems.map((p, i) => (
                <div
                  key={`${p.userId}-${p.number}`}
                  className={`onsite-photo${i === focusIdx ? ' focus' : ''}`}
                  style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.size}vw`, zIndex: i === focusIdx ? 50 : p.z, transform: `translate(-50%,-50%) rotate(${p.rotate}deg)` }}
                >
                  <span className={`onsite-number gender-${p.gender}`}><i>{p.number || '-'}</i></span>
                  <img src={p.photo} alt={p.nick} />
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
                    <div style={{ lineHeight: '4.5vh', fontSize: '3.2vh', color: '#ffd8cc', marginTop: '1vh', fontWeight: 'bold' }}>
                      {f?.onsite_number ?? '-'} - {f?.profile?.nickname || '-'}
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
                    <div style={{ lineHeight: '4.5vh', fontSize: '3.2vh', color: '#ffd8cc', marginTop: '1vh', fontWeight: 'bold' }}>
                      {m?.onsite_number ?? '-'} - {m?.profile?.nickname || '-'}
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
        .onsite-tools { position: fixed; top: 0; right: 0; width: 220px; height: 64px; z-index: 100; opacity: 0; transition: opacity .3s; display: flex; align-items: center; justify-content: flex-end; padding-right: 14px; }
        .onsite-tools:hover { opacity: 1; }
        .onsite-photo { position: absolute; transition: transform .5s, opacity .5s; opacity: .85; }
        .onsite-photo img { width: 100%; height: auto; display: block; border-radius: 1.3vh; border: solid 2px rgba(255,255,255,.6); box-shadow: 0 3px 8px rgba(0,0,0,.35); }
        .onsite-photo.focus { transform: translate(-50%,-50%) scale(2) rotate(0deg) !important; opacity: 1; }
        .onsite-photo.focus img { border-color: #e04d2c; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
        .onsite-number { position: absolute; left: -0.5vw; top: -0.5vw; width: 2.6vw; height: 2.6vw; transform: rotate(-45deg); background: #e04d2c; z-index: 2; }
        .onsite-number:before, .onsite-number:after { content: ""; position: absolute; width: 100%; height: 100%; border-radius: 50%; background: inherit; }
        .onsite-number:before { top: -50%; left: 0; }
        .onsite-number:after { left: 50%; top: 0; }
        .onsite-number i { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: rotate(45deg); color: #fff; font-size: 1.3vw; font-weight: bold; font-style: normal; line-height: 1; text-align: center; }
        .onsite-number.gender-male { background: #0088cc; }
        .onsite-number.gender-female { background: #eb5482; }
        .onsite-nick { position: absolute; left: 0; right: 0; bottom: 0; padding: 2px 4px; text-align: center; background: rgba(0,0,0,.45); color: #fff; font-size: 1.1vw; border-radius: 0 0 1.3vh 1.3vh; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );
};

export default ActivityOnsite;
