import { splitGroupLabel } from '@/components/operation/onsiteGrouping.utils';

/** 组中抽组/单组选人的展示块 */
export interface BlockItem {
  key: string;
  label: string;
  /** group=组名方块 person=用户卡片（无照片时用占位卡） */
  kind: 'group' | 'person';
  /** 用户 ID（免报名入选记录为空；无照片且为空时占位卡标注（未注册）） */
  userId?: string;
  photo?: string;
  number?: number | null;
  gender?: 'male' | 'female' | '';
  group?: string;
}

/** 展示块状态：normal/drawn=滤镜压暗 bright=明暗跳动中亮起 win=中奖金色放大 */
export type BlockCardState = 'normal' | 'bright' | 'win' | 'drawn';

/**
 * 组中抽组/单组选人展示块：组名方块或用户卡片。
 * 状态处理（方案 A · 用户定 2026-11-13）：不用黑蒙版，只对照片做亮度滤镜——
 * 未选中 = brightness(.55) 轻微降饱和；已抽 = brightness(.32) 更深 + 灰度 + 右上角金色「已抽」角标。
 * 用户卡片无照片：12vw × 3:4 占位卡与有照片卡片同尺寸，显示序号徽章与昵称；
 * 免报名入选（无 user_id）标注（未注册）。
 */
export const BlockCard = ({ item, state }: { item: BlockItem; state: BlockCardState }) => {
  const border = state === 'win' ? '3px solid #ffd700' : state === 'bright' ? '2px solid rgba(255,255,255,.8)' : '1px solid rgba(255,255,255,.35)';
  const shadow = state === 'win' ? '0 0 40px rgba(255,215,0,.95)' : 'none';
  const scale = state === 'win' ? 'scale(1.15)' : 'scale(1)';
  const transition = 'transform .3s, box-shadow .3s, opacity .3s';
  // 照片/占位内容滤镜：未选中压暗降饱和、已抽更深 + 灰度；亮起/中奖全彩
  const filter = state === 'drawn' ? 'brightness(.32) saturate(.5) grayscale(.5)' : state === 'normal' ? 'brightness(.55) saturate(.85)' : 'none';
  // 昵称条与序号徽章降亮（保持原 0.55/0.35 与 0.5/0.3 口径）
  const nickOpacity = state === 'drawn' ? 0.35 : state === 'normal' ? 0.55 : 1;
  const badgeDim = state === 'drawn' ? 0.3 : state === 'normal' ? 0.5 : 1;
  // 中奖：昵称金色底 + 深色加粗大字，视觉突出
  const winNickStyle: React.CSSProperties = state === 'win' ? { background: '#ffd700', color: '#3d2a00', fontWeight: 800, fontSize: '1.35vw' } : {};
  /** 已抽角标（右上角金色描边小圆标，观众一眼可辨已抽过） */
  const drawnTag = state === 'drawn' ? (
    <div style={{ position: 'absolute', top: '0.5vw', right: '0.5vw', background: 'rgba(0,0,0,.72)', border: '1px solid #ffd700', color: '#ffd700', fontSize: '0.85vw', lineHeight: 1.4, padding: '0.1vw 0.5vw', borderRadius: '0.7vw', zIndex: 2 }}>已抽</div>
  ) : null;

  if (item.photo) {
    return (
      <div style={{ position: 'relative', width: '12vw', borderRadius: '1vh', overflow: 'hidden', border, boxShadow: shadow, background: '#fff', boxSizing: 'border-box', transform: scale, transition }}>
        <img src={item.photo} alt={item.label} style={{ width: '100%', display: 'block', filter, transition: 'filter .3s' }} />
        {drawnTag}
        <span className="onsite-nick" style={{ opacity: nickOpacity, transition: 'opacity .3s, background .3s, color .3s', ...winNickStyle }}>
          <span className={`onsite-number-inline gender-${item.gender}`} style={{ opacity: badgeDim, transition: 'opacity .3s' }}>{item.number || '-'}</span>
          {item.label}
        </span>
      </div>
    );
  }
  if (item.kind === 'person') {
    // 无照片用户卡：12vw × 3:4 占位卡，与有照片卡片同尺寸、同滤镜口径；居中性别占位字 + 底部序号徽章/昵称
    return (
      <div style={{ position: 'relative', width: '12vw', aspectRatio: '3 / 4', borderRadius: '1vh', overflow: 'hidden', border, boxShadow: shadow, background: 'rgba(255,255,255,.15)', boxSizing: 'border-box', transform: scale, transition }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5vw', color: 'rgba(255,255,255,.5)', filter, transition: 'filter .3s' }}>
          {item.gender === 'male' ? '男' : item.gender === 'female' ? '女' : '?'}
        </div>
        {drawnTag}
        <span className="onsite-nick" style={{ opacity: nickOpacity, transition: 'opacity .3s, background .3s, color .3s', ...winNickStyle }}>
          <span className={`onsite-number-inline gender-${item.gender}`} style={{ opacity: badgeDim, transition: 'opacity .3s' }}>{item.number || '-'}</span>
          {item.label}{item.userId ? '' : '（未注册）'}
        </span>
      </div>
    );
  }
  // 组名排版规则（用户定 2026-11-13，见 splitGroupLabel）：
  //   ≤3 字单行；4 字 2×2；5~6 字两行每行≤3；7~9 字三行每行≤3；10 字以上每行≤4 最多 4 行；有「+」以 + 拆分为准
  //   字号 = min(3.6vw, 内容区宽 8vw ÷ 最长行字数, 内容区高 8vw ÷ 行数 ÷ 行高 1.25)，各行纵向堆叠居中
  //   （方块 10vw，四周内边距 1vw，短组名也保留明显留白）
  // 防御式：label 非字符串时 String 化（历史 HMR/异常数据兜底，避免 [...label] 不可迭代崩溃）
  const labelText = typeof item.label === 'string' ? item.label : String(item.label ?? '');
  const labelParts = splitGroupLabel(labelText);
  const parts = labelParts.length > 0 ? labelParts : [labelText];
  const longestLen = Math.max(1, ...parts.map((p) => [...p].length));
  const fontSize = `${Math.min(3.6, 8 / longestLen, 6.4 / parts.length)}vw`;
  return (
    <div style={{
      width: '10vw', height: '10vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 'bold', color: state === 'win' ? '#3d2a00' : '#fff', borderRadius: '1vh', border, boxShadow: shadow, boxSizing: 'border-box',
      textAlign: 'center', lineHeight: 1.25, wordBreak: 'break-all', padding: '1vw',
      background: state === 'win' ? 'linear-gradient(135deg,#f7b733,#fc4a1a)' : state === 'bright' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.22)',
      transform: scale, transition,
      opacity: state === 'drawn' ? 0.35 : state === 'normal' ? 0.55 : 1,
      filter: state === 'drawn' ? 'grayscale(.9)' : state === 'normal' ? 'grayscale(.5)' : 'none',
      textShadow: state === 'win' ? '0 2px 8px rgba(255,255,255,.6)' : 'none',
    }}>
      {parts.map((part, i) => <div key={i}>{part}</div>)}
    </div>
  );
};
