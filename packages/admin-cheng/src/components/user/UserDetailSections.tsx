import { Avatar, Tag, Image, Switch, Checkbox, Space, Button, Typography } from 'antd';
import { ReactNode } from 'react';
import {
  UserOutlined, IdcardOutlined, WalletOutlined,
  SafetyCertificateOutlined, AccountBookOutlined, LockOutlined,
  CopyOutlined, EditOutlined, AuditOutlined,
} from '@ant-design/icons';
import { formatDateTime, formatDate, parseAsLocal } from '@/utils/format';
import { getAvatarUrl, getFullWidthUrl, getMediumUrl } from '@/utils/imageUtils';
import { useAppNotification } from '@/hooks/useAppNotification';
import {
  MatchProfileAuditStatus, IncomeRange,
  UserGenderLabels, MaritalStatusLabels, EducationLabels,
} from '@/api/types/status';
import type {
  CommunityUserSummary,
  CommunityProfileSummary,
  CommunityMatchProfileSummary,
  CommunityWalletSummary,
} from '@/api/types/user';
import RealNameWithTag from '@/components/user/RealNameWithTag';

const { Text } = Typography;

// ====== 新格式（社区用户嵌套结构） ======

export interface CommunityUserDetailProps {
  user: CommunityUserSummary;
  profile: CommunityProfileSummary;
  matchProfile?: CommunityMatchProfileSummary | null;
  wallet: CommunityWalletSummary | null;
  extraSections?: { title: ReactNode; items: { label: string; value: ReactNode; span?: number }[] }[];
  onEditProfile?: () => void;
  onAuditProfile?: () => void;
}

const BLOOD_MAP: Record<number, string> = { 1: 'A', 2: 'B', 3: 'AB', 4: 'O' };
const INCOME_RANGE_MAP: Record<number, string> = {
  [IncomeRange.BELOW_5K]: '5000 以下',
  [IncomeRange.FIVE_K_TO_8K]: '5000–8000',
  [IncomeRange.EIGHT_K_TO_12K]: '8000–12000',
  [IncomeRange.TWELVE_K_TO_18K]: '12000–18000',
  [IncomeRange.ABOVE_18K]: '18000 以上',
};
function getVisibilityLabel(mp: { is_active: boolean; visibility: number }): string {
  if (!mp.is_active) return '已退出';
  if (mp.visibility === 1) return '公开';
  if (mp.visibility === 2) return '仅专区可见';
  if (mp.visibility === 3) return '已隐藏';
  return '-';
}
function getVisibilityTag(mp: { is_active: boolean; visibility: number }): ReactNode {
  const label = getVisibilityLabel(mp);
  let color: string;
  if (!mp.is_active) color = 'default';
  else if (mp.visibility === 1) color = 'success';
  else if (mp.visibility === 2) color = 'warning';
  else if (mp.visibility === 3) color = 'warning';
  else color = 'default';
  return <Tag color={color}>{label}</Tag>;
}
const MATCH_AUDIT_MAP: Record<number, { color: string; text: string }> = {
  0: { color: 'processing', text: '待审核' },
  1: { color: 'success', text: '已通过' },
  2: { color: 'error', text: '已拒绝' },
  3: { color: 'default', text: '已撤销' },
};

/** 根据 is_migrated / is_activated 推导用户类型标签 */
function userTypeLabel(user: CommunityUserSummary): string {
  if (!user.is_migrated) return '新注册用户';
  if (user.is_activated) return '老用户已激活';
  return '老用户未激活';
}

/** 能成ID + 复制按钮 — 小内嵌组件以使用 hook */
function MatchCodeTitle({ code }: { code: string }) {
  const { success } = useAppNotification();
  return (
    <Space size={8}>
      <IdcardOutlined style={{ fontSize: 18, color: '#1890ff' }} />
      <span>脱单资料</span>
      <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>
        能成ID：{code || '-'}
      </Text>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        onClick={() => {
          navigator.clipboard.writeText(code).then(
            () => success('已复制能成ID'),
            () => {/* ignore */}
          );
        }}
      />
    </Space>
  );
}

export function buildUserDetailSections(props: CommunityUserDetailProps) {
  const { user, profile, matchProfile, wallet, extraSections, onEditProfile, onAuditProfile } = props;

  const sections: { title: ReactNode; items: { label: string; value: ReactNode; span?: number }[] }[] = [
    // ====== 基础资料 ======
    {
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>
            <UserOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />
            基础资料
          </span>
          {onEditProfile && (
            <Button type="link" size="small" icon={<EditOutlined />} style={{ fontSize: 13, marginRight: 8, marginTop: 0 }} onClick={onEditProfile}>
              编辑
            </Button>
          )}
        </div>
      ),
      items: [
        {
          label: '头像',
          value: profile.avatar
            ? <Avatar src={getAvatarUrl(profile.avatar)} size={48} style={{ borderRadius: 8 }} />
            : '-',
          span: 1,
        },
        { label: '昵称', value: <span style={{ fontSize: 16, fontWeight: 600 }}>{profile.nickname || '-'}</span>, span: 1 },
        { label: '手机号', value: user.phone || '-', span: 1 },
        {
          label: '类型',
          value: <Tag>{userTypeLabel(user)}</Tag>,
          span: 1,
        },
        { label: '性别', value: UserGenderLabels[profile.gender] || '-', span: 1 },
        { label: '年龄', value: profile.age ?? '-', span: 1 },
        { label: '生日', value: profile.birth_date ? formatDate(profile.birth_date) : '-', span: 1 },
        { label: '星座', value: profile.zodiac || '-', span: 1 },
      ],
    },
  ];

  // ====== 脱单资料（有数据才显示） ======
  if (matchProfile) {
    sections.push({
      title: <MatchCodeTitle code={matchProfile.match_code} />,
      items: [
        {
          label: '姓名',
          value: (
            <RealNameWithTag
              name={matchProfile.real_name}
              verified={matchProfile.is_real_verified}
              userId={user.user_id}
              clickable
              full
            />
          ),
          span: 1,
        },
        { label: '婚姻状况', value: MaritalStatusLabels[matchProfile.marital_status] || '-', span: 1 },
        { label: '身高', value: matchProfile.height ? `${matchProfile.height} cm` : '-', span: 1 },
        { label: '体重', value: matchProfile.weight ? `${matchProfile.weight} kg` : '-', span: 1 },
        { label: '学历', value: EducationLabels[matchProfile.education] || '-', span: 1 },
        { label: '职业', value: matchProfile.profession || '-', span: 1 },
        { label: '生肖', value: matchProfile.cn_zodiac || '-', span: 1 },
        { label: '血型', value: BLOOD_MAP[matchProfile.blood_type] || '-', span: 1 },
        { label: '民族', value: matchProfile.ethnicity || '-', span: 1 },
        { label: '所在区县', value: matchProfile.current_city || '-', span: 1 },
        { label: '户籍', value: matchProfile.household_registration || '-', span: 1 },
        { label: '家乡', value: matchProfile.hometown || '-', span: 1 },
        { label: '工作单位', value: matchProfile.workplace || '-', span: 1 },
        { label: '收入范围', value: matchProfile.income_range != null ? INCOME_RANGE_MAP[matchProfile.income_range] : '-', span: 1 },
        { label: '照片', value: matchProfile.photos?.length ? (
          <Image.PreviewGroup>
            <Space wrap size={4}>
              {matchProfile.photos.map((url, i) => (
                <Image
                  key={i}
                  width={80}
                  height={80}
                  src={getMediumUrl(url)}
                  preview={{ src: url }}
                  style={{ borderRadius: 4, objectFit: 'cover' }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        ) : '-', span: 2 },
        { label: '兴趣爱好', value: matchProfile.hobby_tags || '-', span: 2 },
        { label: '才艺特长', value: matchProfile.specialties || '-', span: 2 },
        { label: '自我介绍', value: matchProfile.self_intro || '-', span: 2 },
        { label: '择偶要求', value: matchProfile.partner_demand || '-', span: 2 },
        { label: '人气', value: matchProfile.popularity ?? '-', span: 1 },
        { label: '可见范围', value: getVisibilityTag(matchProfile), span: 1 },
        { label: '最后更新', value: matchProfile.updated_at ? formatDateTime(matchProfile.updated_at) : '-', span: 1 },
        {
          label: '审核状态',
          value: (() => {
            const i = MATCH_AUDIT_MAP[matchProfile.audit_status];
            return (
              <Space size={4}>
                <Tag color={i?.color || 'default'}>{i?.text || '-'}</Tag>
                {matchProfile.audit_status === MatchProfileAuditStatus.PENDING && onAuditProfile && (
                  <Button type="link" size="small" icon={<AuditOutlined />} style={{ fontSize: 12, padding: 0 }} onClick={onAuditProfile}>
                    审核
                  </Button>
                )}
              </Space>
            );
          })(),
          span: 1,
        },
      ],
    });
  }

  // ====== 平台数据 ======
  sections.push({
    title: <><WalletOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />平台数据</>,
    items: [
      { label: '注册时间', value: profile.created_at ? formatDateTime(profile.created_at) : '-', span: 1 },
      { label: '最近活跃', value: user.last_active_at ? formatDateTime(user.last_active_at) : '-', span: 1 },
      { label: '金币', value: wallet?.coins ?? 0, span: 1 },
      { label: '钱包余额', value: user.wallet_balance != null ? `¥${(user.wallet_balance / 100).toFixed(2)}` : '¥0.00', span: 1 },
      { label: '嗑学分', value: user.credits ?? 0, span: 1 },
      { label: '本周嗑学分', value: user.credits_weekly ?? 0, span: 1 },
    ],
  });

  if (extraSections && extraSections.length > 0) {
    sections.push(...extraSections);
  }

  return { sections };
}

// ====== 旧格式兼容（业务运营页面: PaymentRecords, RefundRecords, InvoiceManagement, OrderListPage） ======

interface LegacyUserDetailProps {
  user: any;
  onStatusChange?: (checked: boolean) => void;
  onOfficialChange?: (checked: boolean) => void;
  onRecommendChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const ZODIAC_MAP: Array<[number, string, string]> = [
  [20, '摩羯座', '水瓶座'], [19, '水瓶座', '双鱼座'], [20, '双鱼座', '白羊座'],
  [20, '白羊座', '金牛座'], [20, '金牛座', '双子座'], [21, '双子座', '巨蟹座'],
  [22, '巨蟹座', '狮子座'], [22, '狮子座', '处女座'], [22, '处女座', '天秤座'],
  [23, '天秤座', '天蝎座'], [22, '天蝎座', '射手座'], [21, '射手座', '摩羯座'],
];

function getZodiac(birthday: string): string {
  if (!birthday) return '-';
  const d = parseAsLocal(birthday) || new Date(birthday);
  if (isNaN(d.getTime())) return '-';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const [border, prev, curr] = ZODIAC_MAP[month - 1];
  return day < border ? prev : curr;
}

function getAge(birthday: string): number | string {
  if (!birthday) return '-';
  const birth = parseAsLocal(birthday);
  if (!birth || isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : '-';
}

function isExpired(expiry: string): boolean {
  if (!expiry) return false;
  const d = parseAsLocal(expiry);
  if (!d) return false;
  return d < new Date();
}

function CoopRoleTag({ role }: { role: number }) {
  const roleMap: Record<number, { text: string; color: string }> = {
    3: { text: '官方用户', color: 'orange' },
    2: { text: '主理人', color: 'gold' },
    1: { text: '合作商户', color: 'blue' },
  };
  const info = roleMap[role];
  if (!info) return <Tag>未知</Tag>;
  return <Tag color={info.color}>{info.text}</Tag>;
}

function buildLegacySections(props: LegacyUserDetailProps) {
  const { user: d, onStatusChange, onOfficialChange, onRecommendChange, disabled } = props;
  if (!d) return null;

  const hobbies = d.hobby ? d.hobby.split(',').filter(Boolean) : [];

  const sections: any[] = [
    {
      title: <><UserOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />基本信息</>,
      items: [
        { label: '头像', value: d.avatar ? <Avatar src={getAvatarUrl(d.avatar)} size={48} style={{ borderRadius: 8 }} /> : '-' },
        { label: '昵称', value: <span style={{ fontSize: 16, fontWeight: 600 }}>{d.nick || '-'}</span> },
        { label: '真实姓名', value: d.name || '-' },
        { label: '手机号', value: d.phone || '-' },
        { label: '性别', value: UserGenderLabels[d.gender] || '未知' },
        { label: '生日', value: d.birthday ? formatDate(d.birthday) : '-' },
        { label: '年龄', value: getAge(d.birthday) },
        { label: '星座', value: getZodiac(d.birthday) },
        { label: 'MBTI', value: d.mbti || '-', span: 1 },
        { label: '学校', value: d.school || '-', span: 1 },
        { label: '个人介绍', value: d.profile || '-', span: 2 },
        { label: '个人标签', value: hobbies.length > 0 ? hobbies.map((h: string) => <Tag key={h}>{h}</Tag>) : '-', span: 2 },
        { label: '个人主页封面', value: d.cover ? <Image width={80} height={80} src={getFullWidthUrl(d.cover)} preview={{ src: d.cover }} style={{ borderRadius: 8, objectFit: 'cover' }} /> : '-', span: 2 },
      ],
    },
    {
      title: <><AccountBookOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />账户数据</>,
      items: [
        { label: '发帖数', value: d.feeds_total ?? 0 },
        { label: '评论次数', value: d.comments_total ?? 0 },
        { label: '活动发布数', value: d.events_published ?? 0 },
        { label: '活动参与数', value: d.events_joined ?? 0 },
        { label: '关注数', value: d.following_total ?? 0 },
        { label: '粉丝数', value: d.followers_total ?? 0 },
        { label: '积分余额', value: d.points_balance ?? 0 },
        { label: '钱包余额(元)', value: d.wallet_balance != null ? `¥${(d.wallet_balance / 100).toFixed(2)}` : '¥0.00' },
      ],
    },
  ];

  if (onStatusChange || onOfficialChange || onRecommendChange) {
    sections.push(
      {
        title: <><LockOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />账户状态</>,
        items: [
          { label: '用户状态', value: d.status === 3 ? <Tag color="default">未激活</Tag> : <Switch checked={d.status === 0} disabled={disabled} onChange={onStatusChange} checkedChildren="正常" unCheckedChildren="屏蔽" />, span: 1 },
          { label: '最后活跃IP', value: d.last_active_ip || '-', span: 1 },
          { label: '注册时间', value: d.insertat ? formatDateTime(d.insertat) : '-', span: 1 },
          { label: '最后活跃时间', value: d.last_active_at ? formatDateTime(d.last_active_at) : '-', span: 1 },
        ],
      },
      {
        title: <><SafetyCertificateOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />身份信息</>,
        items: [
          { label: '实名认证', value: <Tag color={d.real_auth ? 'success' : 'default'}>{d.real_auth ? '已认证' : '未认证'}</Tag> },
          { label: '实名认证时间', value: d.real_auth_at ? formatDateTime(d.real_auth_at) : '-' },
          { label: '身份认证', value: d.coop_auth ? <CoopRoleTag role={d.coop_role} /> : <Tag>未认证</Tag> },
          { label: '身份认证到期', value: d.coop_auth_expiry ? (isExpired(d.coop_auth_expiry) ? <span style={{ color: 'red' }}>已过期</span> : formatDateTime(d.coop_auth_expiry)) : '-' },
          { label: '用户标记', span: 2, value: (
            <Space size="middle">
              <Checkbox checked={!!(d.coop_auth && !isExpired(d.coop_auth_expiry) && d.coop_role === 3)} disabled={disabled || d.coop_role === 1 || d.coop_role === 2} onChange={(e) => onOfficialChange?.(e.target.checked)}>
                官方用户
              </Checkbox>
              <Checkbox checked={d.recom === 1} disabled={disabled} onChange={(e) => onRecommendChange?.(e.target.checked)}>
                推荐用户
              </Checkbox>
            </Space>
          )},
        ],
      }
    );
  }

  return { sections };
}

// ====== 统一入口：自动检测新旧格式 ======

export type UserDetailSectionsProps = CommunityUserDetailProps | LegacyUserDetailProps;

const UserDetailSections = (props: UserDetailSectionsProps): { sections: any[] } | null => {
  // 新格式：有 profile 字段
  if ('profile' in props && props.profile) {
    return buildUserDetailSections(props as CommunityUserDetailProps);
  }
  // 旧格式：只有 user 字段
  return buildLegacySections(props as LegacyUserDetailProps);
};

export default UserDetailSections;
