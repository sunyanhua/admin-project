import { Tag, Space } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';

interface RealNameWithTagProps {
  /** 姓名（可能为空） */
  name?: string;
  /** 是否实名认证（is_real_verified） */
  verified?: boolean;
  /** 显示完整"实名"文字标签（详情弹窗用）；默认 false：仅展示图标 */
  full?: boolean;
}

/**
 * 姓名 + 实名认证标识（全站脱单用户列表统一组件）
 *
 * - is_real_verified 为 true 时在姓名同行后展示标识：列表为绿色认证图标，
 *   full 时（详情弹窗）显示完整"实名"文字标签。
 */
const RealNameWithTag: React.FC<RealNameWithTagProps> = ({ name, verified, full }) => {
  const nameNode = name ? <span>{name}</span> : <span style={{ color: '#999' }}>-</span>;

  if (!verified) return nameNode;

  const badge = full ? (
    <Tag color="green" icon={<SafetyCertificateOutlined />} title="已实名" style={{ marginInlineEnd: 0 }}>
      实名
    </Tag>
  ) : (
    <SafetyCertificateOutlined title="已实名" style={{ color: '#52c41a', fontSize: 14 }} />
  );

  return (
    <Space size={4}>{nameNode}{badge}</Space>
  );
};

export default RealNameWithTag;
