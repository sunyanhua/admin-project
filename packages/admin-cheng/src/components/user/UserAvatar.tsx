import { Avatar } from 'antd';
import type { CSSProperties } from 'react';
import { getAvatarUrl } from '@/utils/imageUtils';

interface UserAvatarProps {
  /** 头像原图 URL（可为空） */
  src?: string | null;
  /** 昵称（兜底显示首字） */
  nick?: string | null;
  size?: number;
  style?: CSSProperties;
}

/**
 * 用户头像统一组件：
 * 头像为空或加载失败时兜底显示昵称首字（蓝底），避免 antd 默认灰色占位块。
 * 所有用户列表处的头像统一使用本组件。
 */
const UserAvatar: React.FC<UserAvatarProps> = ({ src, nick, size = 40, style }) => (
  <Avatar
    src={src ? getAvatarUrl(src) : undefined}
    size={size}
    style={{ borderRadius: '50%', flexShrink: 0, background: '#1890ff', ...style }}
  >
    {nick?.charAt(0) || '?'}
  </Avatar>
);

export default UserAvatar;
