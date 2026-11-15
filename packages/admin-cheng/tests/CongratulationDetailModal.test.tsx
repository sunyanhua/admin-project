import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { App } from 'antd';
import CongratulationDetailModal from '@/components/operation/CongratulationDetailModal';

/** 已通过、未设置随份子 */
const DETAIL_APPROVED = vi.hoisted(() => ({
  id: 'c1', status: 1, is_official_gift: false,
  male_nickname: '张三', female_nickname: '李四', created_at: '2026-11-15T10:00:00+08:00',
}));

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

beforeAll(() => {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

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
    expect(within(section).getByText(/已设置 ¥520\.00/)).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: /设置随份子/ })).toBeNull();
  });

  it('已提交状态：不显示独立设置区块', async () => {
    getDetailMock.mockResolvedValue({ ...DETAIL_APPROVED, status: 0 });
    renderModal();
    await screen.findByText(/张三/);
    expect(screen.queryByTestId('gift-setting-section')).toBeNull();
  });

  it('勾选后未填金额：拦截并提示，不调接口', async () => {
    renderModal();
    const section = await screen.findByTestId('gift-setting-section');
    fireEvent.click(within(section).getByRole('checkbox'));
    fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
    expect(await screen.findByText('请填写大于 0 的金额')).toBeInTheDocument();
    expect(setGiftMock).not.toHaveBeenCalled();
  });

  it('勾选并填金额：按分调用 setGift，成功后刷新并关闭', async () => {
    setGiftMock.mockResolvedValue({});
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderModal(onClose, onSuccess);
    const section = await screen.findByTestId('gift-setting-section');
    fireEvent.click(within(section).getByRole('checkbox'));
    fireEvent.change(within(section).getByRole('spinbutton'), { target: { value: '5.20' } });
    fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
    await waitFor(() => expect(setGiftMock).toHaveBeenCalledWith('c1', { is_official_gift: true, gift_amount: 520 }));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('已通过状态：审核区不显示随份子勾选', async () => {
    renderModal();
    const audit = await screen.findByTestId('audit-section');
    expect(within(audit).queryByText('官方随份子')).toBeNull();
  });
});
