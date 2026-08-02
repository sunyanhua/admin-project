import React from 'react';
import { Descriptions, Image, Spin, Typography, Divider } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import type { AdminUserDetailResponse } from '@/api/types/user';
import { UserGender } from '@/api/types/status';
import { getAvatarUrl } from '@/utils/imageUtils';

const { Text } = Typography;

interface Props {
  open: boolean;
  loading: boolean;
  data: AdminUserDetailResponse | null;
  onClose: () => void;
}

const GENDER_LABEL: Record<number, string> = { [UserGender.MALE]: '男', [UserGender.FEMALE]: '女' };

const UserDetailModal: React.FC<Props> = ({ open, loading, data, onClose }) => {
  return (
    <ScrollableModal title="用户详情" open={open} onCancel={onClose} footer={null} width={680}>
      <Spin spinning={loading}>
        {data ? (
          <>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>基本信息</Text>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="头像" span={2}>
                <Image width={80} src={getAvatarUrl(data.avatar)} />
              </Descriptions.Item>
              <Descriptions.Item label="昵称">{data.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="姓名">{data.real_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机">{data.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="性别">{GENDER_LABEL[data.gender] || '未设置'}</Descriptions.Item>
              <Descriptions.Item label="出生日期">{data.birth_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="年龄">-</Descriptions.Item>
              <Descriptions.Item label="星座">{data.zodiac || '-'}</Descriptions.Item>
              <Descriptions.Item label="所在区">-</Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0 16px' }} />

            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>账户信息</Text>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="积分余额">-</Descriptions.Item>
              <Descriptions.Item label="订单数">-</Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>
        )}
      </Spin>
    </ScrollableModal>
  );
};

export default UserDetailModal;
