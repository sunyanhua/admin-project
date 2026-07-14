import { Avatar, Tag, Image, Switch, Checkbox, Space } from 'antd';
import { UserOutlined, SafetyCertificateOutlined, AccountBookOutlined, LockOutlined } from '@ant-design/icons';

export interface UserDetailSectionsProps {
  user: any;
  onStatusChange?: (checked: boolean) => void;
  onOfficialChange?: (checked: boolean) => void;
  onRecommendChange?: (checked: boolean) => void;
  disabled?: boolean;
}

const formatDateTime = (dt: string): string => {
  if (!dt) return '-';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const formatDate = (dt: string): string => {
  if (!dt) return '-';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

const GENDER_MAP: Record<number, string> = { 1: '男', 2: '女' };

const ZODIAC_MAP: Array<[number, string, string]> = [
  [20, '摩羯座', '水瓶座'], [19, '水瓶座', '双鱼座'], [20, '双鱼座', '白羊座'],
  [20, '白羊座', '金牛座'], [20, '金牛座', '双子座'], [21, '双子座', '巨蟹座'],
  [22, '巨蟹座', '狮子座'], [22, '狮子座', '处女座'], [22, '处女座', '天秤座'],
  [23, '天秤座', '天蝎座'], [22, '天蝎座', '射手座'], [21, '射手座', '摩羯座'],
];

const getZodiac = (birthday: string): string => {
  if (!birthday) return '-';
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return '-';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const [border, prev, curr] = ZODIAC_MAP[month - 1];
  return day < border ? prev : curr;
};

const getAge = (birthday: string): number | string => {
  if (!birthday) return '-';
  const birth = new Date(birthday);
  if (isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : '-';
};

const isExpired = (expiry: string): boolean => {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
};

const CoopRoleTag = ({ role }: { role: number }) => {
  const roleMap: Record<number, { text: string; color: string }> = {
    3: { text: '官方用户', color: 'orange' },
    2: { text: '主理人', color: 'gold' },
    1: { text: '合作商户', color: 'blue' },
  };
  const roleInfo = roleMap[role];
  if (!roleInfo) return <Tag>未知</Tag>;
  return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
};

const UserDetailSections = ({ user, onStatusChange, onOfficialChange, onRecommendChange, disabled }: UserDetailSectionsProps) => {
  if (!user) return null;

  const d = user;
  const hobbies = d.hobby ? d.hobby.split(',').filter(Boolean) : [];

  const sections: any[] = [
    {
      title: <><UserOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />基本信息</>,
      items: [
        { label: '头像', value: d.avatar ? <Avatar src={d.avatar} size={48} style={{ borderRadius: 8 }} /> : '-' },
        { label: '昵称', value: <span style={{ fontSize: 16, fontWeight: 600 }}>{d.nick || '-'}</span> },
        { label: '真实姓名', value: d.name || '-' },
        { label: '手机号', value: d.phone || '-' },
        { label: '性别', value: GENDER_MAP[d.gender] || '未知' },
        { label: '生日', value: d.birthday ? formatDate(d.birthday) : '-' },
        { label: '年龄', value: getAge(d.birthday) },
        { label: '星座', value: getZodiac(d.birthday) },
        { label: 'MBTI', value: d.mbti || '-', span: 1 },
        { label: '学校', value: d.school || '-', span: 1 },
        { label: '个人介绍', value: d.profile || '-', span: 2 },
        { label: '个人标签', value: hobbies.length > 0 ? hobbies.map((h: string) => <Tag key={h}>{h}</Tag>) : '-', span: 2 },
        { label: '个人主页封面', value: d.cover ? <Image width={80} height={80} src={d.cover} style={{ borderRadius: 8, objectFit: 'cover' }} /> : '-', span: 2 },
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
};

export default UserDetailSections;