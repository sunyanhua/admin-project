import { useState } from 'react';
import { Button, Spin, Typography } from 'antd';
import { EyeOutlined, CopyOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import ScrollableModal from '@/components/templates/ScrollableModal';
import type { AdminUserPrivacyResponse } from '@/api/types/user';

const { Text } = Typography;

interface IdCardViewButtonProps {
  /** 用户 ID —— 点击后通过 POST /admin/v1/bizops/user/privacy/{id} 拉取脱敏身份证号 */
  userId?: string;
  /** 自定义隐私拉取（专区申请/活动报名的专用隐私接口），缺省用通用 userApi.getUserPrivacy */
  fetchPrivacy?: (userId: string) => Promise<any>;
}

/**
 * 身份证号"查看"按钮：点击后拉取隐私接口，弹窗展示脱敏身份证号（接口带水印审计，每次读取均留痕）。
 */
const IdCardViewButton: React.FC<IdCardViewButtonProps> = ({ userId, fetchPrivacy }) => {
  const { success, error: showError } = useAppNotification();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState<AdminUserPrivacyResponse | null>(null);

  const handleView = async () => {
    if (!userId) return;
    setVisible(true);
    setLoading(true);
    setPrivacy(null);
    try {
      const res: any = await (fetchPrivacy || userApi.getUserPrivacy)(userId);
      setPrivacy(res || null);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取身份信息失败');
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        style={{ padding: 0, height: 'auto' }}
        onClick={handleView}
      >
        查看
      </Button>
      <ScrollableModal
        title="身份证信息"
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
              <div style={{ fontSize: 15, fontWeight: 500 }}>{privacy.real_name || '-'}</div>
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
    </>
  );
};

export default IdCardViewButton;
