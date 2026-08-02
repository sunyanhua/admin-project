import { Avatar } from 'antd';
import { UserOutlined, AccountBookOutlined } from '@ant-design/icons';
import { formatDate, parseAsLocal } from '@/utils/format';
import { getAvatarUrl } from '@/utils/imageUtils';

export interface UserDetailSectionsProps {
  user: any;
}

const GENDER_MAP: Record<number, string> = { 1: '男', 2: '女' };

const ZODIAC_MAP: Array<[number, string, string]> = [
  [20, '摩羯座', '水瓶座'], [19, '水瓶座', '双鱼座'], [20, '双鱼座', '白羊座'],
  [20, '白羊座', '金牛座'], [20, '金牛座', '双子座'], [21, '双子座', '巨蟹座'],
  [22, '巨蟹座', '狮子座'], [22, '狮子座', '处女座'], [22, '处女座', '天秤座'],
  [23, '天秤座', '天蝎座'], [22, '天蝎座', '射手座'], [21, '射手座', '摩羯座'],
];

const getZodiac = (birthday: string): string => {
  if (!birthday) return '-';
  const d = parseAsLocal(birthday) || new Date(birthday);
  if (isNaN(d.getTime())) return '-';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const [border, prev, curr] = ZODIAC_MAP[month - 1];
  return day < border ? prev : curr;
};

const getAge = (birthday: string): number | string => {
  if (!birthday) return '-';
  const birth = parseAsLocal(birthday);
  if (!birth || isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : '-';
};

const UserDetailSections = ({ user }: UserDetailSectionsProps) => {
  if (!user) return null;

  const d = user;

  const sections: any[] = [
    {
      title: <><UserOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />基本信息</>,
      items: [
        { label: '头像', value: d.avatar_url ? <Avatar src={getAvatarUrl(d.avatar_url)} size={48} style={{ borderRadius: 8 }} /> : '-' },
        { label: '昵称', value: <span style={{ fontSize: 16, fontWeight: 600 }}>{d.nickname || '-'}</span> },
        { label: '姓名', value: d.name || '-' },
        { label: '手机', value: d.phone_masked || d.phone || '-' },
        { label: '性别', value: GENDER_MAP[d.gender] || '未知' },
        { label: '出生日期', value: d.birthday ? formatDate(d.birthday) : '-' },
        { label: '年龄', value: getAge(d.birthday) },
        { label: '星座', value: getZodiac(d.birthday) },
        { label: '所在区县', value: d.district || d.area || '-', span: 2 },
      ],
    },
    {
      title: <><AccountBookOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 6 }} />账户信息</>,
      items: [
        { label: '积分余额', value: d.points_balance != null ? d.points_balance : '-' },
        { label: '订单数', value: d.order_count != null ? d.order_count : '-' },
      ],
    },
  ];

  return { sections };
};

export default UserDetailSections;
