import { useState } from 'react';
import { Tag, Space, Spin, Button, Typography } from 'antd';
import { SafetyCertificateOutlined, CopyOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import ScrollableModal from '@/components/templates/ScrollableModal';
import type { AdminUserPrivacyResponse } from '@/api/types/user';

const { Text } = Typography;

interface RealNameWithTagProps {
  /** 姓名（可能为空） */
  name?: string;
  /** 是否实名认证（is_real_verified） */
  verified?: boolean;
  /** 用户 ID —— 提供后标签可点击查看身份证号 */
  userId?: string;
  /** 标签是否可点击查看身份证号（仅详情场景传 true，列表只展示标签） */
  clickable?: boolean;
  /** 显示完整"实名"文字标签（详情弹窗用）；默认 false：仅展示图标 */
  full?: boolean;
}

/**
 * 姓名 + 实名认证标识（全站脱单用户列表统一组件）
 *
 * - is_real_verified 为 true 时在姓名同行后展示标识：列表为绿色认证图标，
 *   full 时（详情弹窗）显示完整"实名"文字标签；
 * - clickable + userId：点击标识通过 POST /admin/v1/bizops/user/privacy/{id}
 *   拉取脱敏身份证号并弹窗展示（接口带水印审计，每次读取均留痕）。
 */
const RealNameWithTag: React.FC<RealNameWithTagProps> = ({ name, verified, userId, clickable, full }) => {
  const { success, error: showError } = useAppNotification();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState<AdminUserPrivacyResponse | null>(null);

  const handleViewIdCard = async () => {
    if (!userId) return;
    setVisible(true);
    setLoading(true);
    setPrivacy(null);
    try {
      const res: any = await userApi.getUserPrivacy(userId);
      setPrivacy(res || null);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取身份信息失败');
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const nameNode = name ? <span>{name}</span> : <span style={{ color: '#999' }}>-</span>;

  if (!verified) return nameNode;

  const badge = full ? (
    <Tag
      color="green"
      icon={<SafetyCertificateOutlined />}
      title={clickable ? '已实名，点击查看身份证号' : '已实名'}
      style={{ cursor: clickable ? 'pointer' : undefined, marginInlineEnd: 0 }}
      onClick={clickable ? handleViewIdCard : undefined}
    >
      实名
    </Tag>
  ) : (
    <SafetyCertificateOutlined
      title={clickable ? '已实名，点击查看身份证号' : '已实名'}
      style={{ color: '#52c41a', fontSize: 14, cursor: clickable ? 'pointer' : undefined }}
      onClick={clickable ? handleViewIdCard : undefined}
    />
  );

  return (
    <>
      <Space size={4}>{nameNode}{badge}</Space>
      {clickable && (
        <ScrollableModal
          title="实名认证信息"
          open={visible}
          onCancel={() => setVisible(false)}
          width={460}
          footer={false}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
          ) : privacy ? (
            <div style={{ padding: '8px 0' }}>
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">姓名</Text>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{privacy.real_name || name || '-'}</div>
              </div>
              <div>
                <Text type="secondary">身份证号</Text>
                <div style={{ fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{privacy.id_card || '-'}</span>
                  {privacy.id_card && (
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(privacy.id_card!).then(
                          () => success('已复制身份证号'),
                          () => {/* ignore */}
                        );
                      }}
                    >
                      复制
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </ScrollableModal>
      )}
    </>
  );
};

export default RealNameWithTag;
