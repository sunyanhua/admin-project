import { Tag, Descriptions } from 'antd';
import { formatDateTime } from '@/utils/format';

function formatAmount(amount?: number): string {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
}

export interface OrderDetailModalProps {
  /** 详情数据 */
  data: any;
  /** 状态映射 */
  statusMap?: Record<number, { text: string; color: string }>;
  /** 项目区域标题 — "报名项目" / "购票项目" / "购买商品" */
  productLabel?: string;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ data: d, statusMap, productLabel }) => {
  if (!d) return null;

  const master = d.master_order || d;
  const subOrders = d.sub_orders || [];
  const user = d.user;
  const shipping = d.shipping_address;
  const detailItems: any[] = subOrders.length > 0
    ? subOrders.flatMap((so: any) => so.items || [])
    : (d.items || []);

  const statusText = master.status !== undefined
    ? (statusMap?.[master.status]?.text || '其他')
    : '其他';
  const statusColor = master.status !== undefined
    ? (statusMap?.[master.status]?.color || 'default')
    : 'default';

  return (
    <div>
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="订单状态">
          <Tag color={statusColor}>{statusText}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="订单类型">{master.order_type === 'physical' ? '实物' : '核销'}</Descriptions.Item>
        <Descriptions.Item label="用户昵称">{user?.nickname || d.user_data?.nickname || '-'}</Descriptions.Item>
        <Descriptions.Item label="用户手机">{user?.phone_masked || d.user_data?.phone_masked || '-'}</Descriptions.Item>
        <Descriptions.Item label="应付金额">{formatAmount(master.total_amount || d.total_amount)}</Descriptions.Item>
        <Descriptions.Item label="实付金额">{formatAmount(master.pay_amount ?? master.payable_amount ?? d.pay_amount ?? d.payable_amount)}</Descriptions.Item>
        <Descriptions.Item label="下单时间">{master.created_at ? formatDateTime(master.created_at) : '-'}</Descriptions.Item>
        <Descriptions.Item label="支付时间">{master.paid_at ? formatDateTime(master.paid_at) : '-'}</Descriptions.Item>
        {detailItems.length > 0 && (
          <Descriptions.Item label={productLabel || '商品明细'} span={2}>
            {detailItems.map((item: any, i: number) => (
              <div key={i} style={{ lineHeight: 1.6, marginBottom: i < detailItems.length - 1 ? 6 : 0 }}>
                <div style={{ wordBreak: 'break-word' }}>{item.product_title || '-'}</div>
                <div style={{ color: '#999', fontSize: 12, wordBreak: 'break-word' }}>
                  {item.sku_spec_text || item.sku_name || ''}
                  {item.quantity != null ? ` × ${item.quantity}` : ''}
                </div>
              </div>
            ))}
          </Descriptions.Item>
        )}
      </Descriptions>

      {shipping && (
        <>
          <div style={{ fontWeight: 600, margin: '16px 0 8px', fontSize: 14 }}>收货地址</div>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="收货人">{shipping.recipient_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{shipping.recipient_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="地址">{`${shipping.province || ''}${shipping.city || ''}${shipping.district || ''} ${shipping.detail || ''}`}</Descriptions.Item>
          </Descriptions>
        </>
      )}
    </div>
  );
};

export default OrderDetailModal;

/** 金额格式化（与 OrderListPage 共用） */
export function formatAmount(amount?: number): string {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
}
