import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CongratulationGiftStatusTag from '@/components/operation/CongratulationGiftStatusTag';

const itemOf = (patch: Record<string, any>) => ({ id: 'c1', status: 1, ...patch }) as any;

describe('CongratulationGiftStatusTag 官方随份子三态', () => {
  it('无结婚证：灰 Tag「未上传结婚证」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ has_marriage_certificate: false, is_official_gift: false })} />);
    const tag = screen.getByText('未上传结婚证');
    expect(tag).toHaveAttribute('title', '未上传结婚证');
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-default');
  });

  it('有结婚证未随份子：蓝 Tag「已传结婚证，未随份子」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ has_marriage_certificate: true, is_official_gift: false })} />);
    const tag = screen.getByText('已传结婚证，未随份子');
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-blue');
  });

  it('已随份子：绿 Tag「已随￥520.00」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ is_official_gift: true, gift_amount: 52000 })} />);
    const tag = screen.getByText('已随￥520.00');
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-green');
  });

  it('已随份子但金额为 null：显示「已随￥0.00」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ is_official_gift: true, gift_amount: null })} />);
    expect(screen.getByText('已随￥0.00')).toBeInTheDocument();
  });

  it('非整元金额：150 分 →「已随￥1.50」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ is_official_gift: true, gift_amount: 150 })} />);
    expect(screen.getByText('已随￥1.50')).toBeInTheDocument();
  });

  it('已随优先：无结婚证但已随份子 → 显示已随', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ has_marriage_certificate: false, is_official_gift: true, gift_amount: 200 })} />);
    expect(screen.getByText('已随￥2.00')).toBeInTheDocument();
  });
});
