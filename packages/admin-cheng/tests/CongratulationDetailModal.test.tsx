import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { App } from 'antd';
import { CongratulationStatus } from '@shared/constants';
import CongratulationDetailModal from '@/components/operation/CongratulationDetailModal';

/** 已通过、未设置随份子 */
const DETAIL_APPROVED = {
  id: 'c1', status: CongratulationStatus.APPROVED, is_official_gift: false,
  male_nickname: '张三', female_nickname: '李四', created_at: '2026-11-15T10:00:00+08:00',
};

const getDetailMock = vi.hoisted(() => vi.fn());
const setGiftMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/services/congratulation', () => ({
  congratulationApi: {
    getDetail: getDetailMock,
    setGift: setGiftMock,
    audit: auditMock,
  },
}));

beforeEach(() => {
  getDetailMock.mockReset();
  setGiftMock.mockReset();
  auditMock.mockReset();
  getDetailMock.mockResolvedValue(DETAIL_APPROVED);
});

const renderModal = (onClose = vi.fn(), onSuccess = vi.fn()) =>
  render(
    <App>
      <CongratulationDetailModal visible congratulationId="c1" onClose={onClose} onSuccess={onSuccess} />
    </App>,
  );

describe('CongratulationDetailModal 独立设置官方随份子', () => {
  it('已通过且未设置：显示独立设置区块', async () => {
    renderModal();
    const section = await screen.findByTestId('gift-setting-section');
    expect(within(section).getByRole('checkbox')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: /设置随份子/ })).toBeInTheDocument();
  });

  it('已通过且已设置：区块只读，无设置按钮', async () => {
    getDetailMock.mockResolvedValue({ ...DETAIL_APPROVED, is_official_gift: true, gift_amount: 52000 });
    renderModal();
    const section = await screen.findByTestId('gift-setting-section');
    expect(within(section).getByText(/已设置 ￥520\.00/)).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: /设置随份子/ })).toBeNull();
  });

  it('已提交状态：不显示独立设置区块，但显示审核区', async () => {
    getDetailMock.mockResolvedValue({ ...DETAIL_APPROVED, status: CongratulationStatus.SUBMITTED });
    renderModal();
    await screen.findByText(/张三/);
    expect(screen.queryByTestId('gift-setting-section')).toBeNull();
    expect(screen.getByTestId('audit-section')).toBeInTheDocument();
  });

  it('已通过状态：审核区整体不显示（审核完成不可重新提交）', async () => {
    renderModal();
    await screen.findByTestId('gift-setting-section');
    expect(screen.queryByTestId('audit-section')).toBeNull();
  });

  it('未通过状态：审核区同样不显示', async () => {
    getDetailMock.mockResolvedValue({ ...DETAIL_APPROVED, status: CongratulationStatus.REJECTED });
    renderModal();
    await screen.findByText(/张三/);
    expect(screen.queryByTestId('audit-section')).toBeNull();
  });

  it('未勾选点击设置：提示并拦截，不调接口', async () => {
    renderModal();
    const section = await screen.findByTestId('gift-setting-section');
    fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
    expect(await screen.findByText('请勾选官方随份子')).toBeInTheDocument();
    expect(setGiftMock).not.toHaveBeenCalled();
  });

  it('勾选后清空金额：提示并拦截，不调接口', async () => {
    renderModal();
    const section = await screen.findByTestId('gift-setting-section');
    fireEvent.click(within(section).getByRole('checkbox'));
    fireEvent.change(within(section).getByRole('spinbutton'), { target: { value: '' } });
    fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
    expect(await screen.findByText('请填写大于 0 的金额')).toBeInTheDocument();
    expect(setGiftMock).not.toHaveBeenCalled();
  });

  it('勾选后金额默认 520 元：确认弹窗后按 52000 分调用一次，成功后刷新并关闭', async () => {
    setGiftMock.mockResolvedValue({});
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderModal(onClose, onSuccess);
    const section = await screen.findByTestId('gift-setting-section');
    fireEvent.click(within(section).getByRole('checkbox'));
    expect(within(section).getByRole('spinbutton')).toHaveValue('520.00');
    fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
    // 不可逆写入先弹确认（确认按钮出现即弹窗已开）
    await screen.findByRole('button', { name: '确认设置' });
    fireEvent.click(screen.getByRole('button', { name: '确认设置' }));
    await waitFor(() => expect(setGiftMock).toHaveBeenCalledWith('c1', { is_official_gift: true, gift_amount: 52000 }));
    expect(setGiftMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('自定义金额覆盖默认值：填 1.50 元确认后按 150 分提交一次', async () => {
    setGiftMock.mockResolvedValue({});
    renderModal();
    const section = await screen.findByTestId('gift-setting-section');
    fireEvent.click(within(section).getByRole('checkbox'));
    fireEvent.change(within(section).getByRole('spinbutton'), { target: { value: '1.50' } });
    fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
    await screen.findByRole('button', { name: '确认设置' });
    fireEvent.click(screen.getByRole('button', { name: '确认设置' }));
    await waitFor(() => expect(setGiftMock).toHaveBeenCalledWith('c1', { is_official_gift: true, gift_amount: 150 }));
    expect(setGiftMock).toHaveBeenCalledTimes(1);
  });

  it('接口失败：提示后端错误并重拉详情保持状态一致', async () => {
    setGiftMock.mockRejectedValue({ response: { data: { message: '服务器错误' } } });
    renderModal();
    const section = await screen.findByTestId('gift-setting-section');
    fireEvent.click(within(section).getByRole('checkbox'));
    fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
    await screen.findByRole('button', { name: '确认设置' });
    fireEvent.click(screen.getByRole('button', { name: '确认设置' }));
    expect(await screen.findByText('服务器错误')).toBeInTheDocument();
    await waitFor(() => expect(getDetailMock).toHaveBeenCalledTimes(2));
  });

  it('审核流程（已提交）：勾选随份子默认 520，提交审核携带 gift_amount 52000', async () => {
    getDetailMock.mockResolvedValue({ ...DETAIL_APPROVED, status: CongratulationStatus.SUBMITTED });
    auditMock.mockResolvedValue({});
    const onClose = vi.fn();
    renderModal(onClose);
    const audit = await screen.findByTestId('audit-section');
    fireEvent.click(within(audit).getByRole('checkbox'));
    expect(within(audit).getByRole('spinbutton')).toHaveValue('520.00');
    fireEvent.click(screen.getByRole('button', { name: /提交审核/ }));
    await waitFor(() => expect(auditMock).toHaveBeenCalledWith('c1', {
      approved: true, reason: undefined, is_official_gift: true, gift_amount: 52000,
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
