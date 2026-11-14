import { Tag } from 'antd';
import { AdminCongratulationItem } from '@/api/services/congratulation';
import { formatCents } from '@/utils/format';

/**
 * 官方随份子三态 Tag（2026-11-15 用户定，按结婚证判定）：
 * 1. 未上传结婚证（灰）；2. 已传结婚证，未随份子（蓝）；3. 已随￥{金额}（绿，已随最高优先）。
 */
const CongratulationGiftStatusTag: React.FC<{ item: AdminCongratulationItem }> = ({ item }) => {
  if (item.is_official_gift) {
    const text = `已随￥${formatCents(item.gift_amount ?? 0)}`;
    return <Tag color="green" title={text}>{text}</Tag>;
  }
  if (item.has_marriage_certificate === true) {
    return <Tag color="blue" title="已传结婚证，未随份子">已传结婚证，未随份子</Tag>;
  }
  return <Tag color="default" title="未上传结婚证">未上传结婚证</Tag>;
};

export default CongratulationGiftStatusTag;
