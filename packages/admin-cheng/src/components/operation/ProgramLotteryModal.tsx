import { useState, useEffect } from 'react';
import { Button, Space, Form, Select, Input, InputNumber, DatePicker, TimePicker, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { PrizeType, PrizeTypeLabels } from '@shared/constants';
import { lotteryApi } from '@/api/services/lottery';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import ScrollableModal from '@/components/templates/ScrollableModal';
import dayjs, { Dayjs } from 'dayjs';
import { dayjsToApi } from '@/utils/format';
import type { VoucherLibraryItem } from '@/components/operation/VoucherLibraryModal';

const DEFAULT_ICONS: Record<number, string> = {
  [PrizeType.COINS]: 'https://tlnc-cdn.vbegin.com.cn/upload/upload/1/20260810/019feb5f-b517-7cd8-ab6f-84354200c5e0.png',
};

const DEFAULT_TIME_SLOTS = [
  { start: '17:00', end: '17:30' },
  { start: '17:30', end: '18:00' },
  { start: '18:00', end: '18:30' },
  { start: '18:30', end: '19:00' },
];

interface TimeSlot {
  key: string;
  start: string;
  end: string;
}

interface PrizeFormItem {
  key: string;
  name: string;
  prize_type: number;
  icon: string;
  amount?: number;
  total_count?: number;
}

interface ProgramLotteryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (lotteryConfigs: LotteryConfig[]) => void;
  existingConfigs: LotteryConfig[];
  voucherLibraries: VoucherLibraryItem[];
  onVoucherUpdate: (libraries: VoucherLibraryItem[]) => void;
  copyFrom?: LotteryConfig | null;
}

export interface LotteryConfig {
  date: string;
  pools: LotteryPoolConfig[];
}

export interface LotteryPoolConfig {
  id: string;
  timeRange: string;
  prizes: LotteryPrizeConfig[];
}

export interface LotteryPrizeConfig {
  name: string;
  type: number;
  icon: string;
  amount?: number;
  quantity: number;
}

let slotCounter = 0;
let prizeCounter = 0;

const ProgramLotteryModal: React.FC<ProgramLotteryModalProps> = ({
  visible, onClose, onSuccess, existingConfigs, voucherLibraries, onVoucherUpdate, copyFrom,
}) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [lotteryDate, setLotteryDate] = useState<Dayjs | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [prizes, setPrizes] = useState<PrizeFormItem[]>([]);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getNextSaturday = (): Dayjs => {
    const today = dayjs();
    const dayOfWeek = today.day();
    const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek);
    return today.add(daysUntilSaturday, 'day');
  };

  useEffect(() => {
    if (!visible) return;
    setLotteryDate(getNextSaturday());
    if (copyFrom) {
      // 从复制源解析时段和奖品
      const slots = copyFrom.pools.map(p => {
        const [start, end] = p.timeRange.split('-');
        return { key: `slot_${slotCounter++}`, start: start || '', end: end || '' };
      });
      setTimeSlots(slots.length > 0 ? slots : DEFAULT_TIME_SLOTS.map(s => ({ key: `slot_${slotCounter++}`, ...s })));
      // 取第一个奖池的奖品作为模板
      const firstPool = copyFrom.pools[0];
      if (firstPool?.prizes.length > 0) {
        const copiedPrizes: PrizeFormItem[] = firstPool.prizes.map(p => ({
          key: `prize_${prizeCounter++}`,
          name: p.name,
          prize_type: p.type,
          icon: p.icon,
          amount: p.amount,
          total_count: p.quantity,
        }));
        setPrizes(copiedPrizes);
      } else {
        setPrizes([]);
      }
    } else {
      setTimeSlots(DEFAULT_TIME_SLOTS.map(s => ({ key: `slot_${slotCounter++}`, ...s })));
      setPrizes([]);
    }
  }, [visible]);

  const voucherOptions = voucherLibraries.map((lib, i) => {
    const remaining = lib.total_count - lib.used_count;
    return {
      label: `${lib.name}（余${remaining}）`,
      value: 1000 + i,
      libName: lib.name,
      remaining,
      disabled: remaining <= 0,
    };
  });

  const getPrizeType = (v: number) => (v >= 1000 ? PrizeType.VOUCHER : v);
  const getVoucherLibIdx = (v: number) => (v >= 1000 ? v - 1000 : -1);
  const isVoucherType = (v: number) => v >= 1000;
  const isCoins = (v: number) => v === PrizeType.COINS;

  const handleAddSlot = () => {
    setTimeSlots(prev => [...prev, { key: `slot_${slotCounter++}`, start: '20:00', end: '20:30' }]);
  };

  const handleRemoveSlot = (key: string) => {
    setTimeSlots(prev => prev.filter(s => s.key !== key));
  };

  const handleSlotChange = (key: string, field: 'start' | 'end', value: string) => {
    setTimeSlots(prev => prev.map(s => s.key === key ? { ...s, [field]: value } : s));
  };

  const handleAddPrize = () => {
    setPrizes(prev => [...prev, {
      key: `prize_${prizeCounter++}`,
      name: '',
      prize_type: PrizeType.COINS,
      icon: DEFAULT_ICONS[PrizeType.COINS] || '',
    }]);
  };

  const handleRemovePrize = (key: string) => {
    setPrizes(prev => prev.filter(p => p.key !== key));
  };

  const handlePrizeChange = (key: string, field: string, value: any) => {
    setPrizes(prev => prev.map(p => {
      if (p.key !== key) return p;
      const updated = { ...p, [field]: value };

      // 红包：输入金额后自动填充名称
      if (field === 'amount' && isCoins(p.prize_type) && typeof value === 'number' && value > 0) {
        updated.name = `红包${value}元`;
      }
      // 选券码库：自动填充名称 + 图标
      if (field === 'prize_type' && isVoucherType(value)) {
        const opt = voucherOptions.find(o => o.value === value);
        if (opt) {
          updated.name = opt.libName;
          const lib = voucherLibraries[getVoucherLibIdx(value)];
          if (lib?.icon) updated.icon = lib.icon;
        }
      }
      return updated;
    }));
  };

  const handleSubmit = async () => {
    if (!lotteryDate) { showError('请选择抽奖日期'); return; }

    if (timeSlots.length === 0) { showError('请至少添加一个抽奖时段'); return; }
    for (const slot of timeSlots) {
      if (!slot.start || !slot.end) { showError('请完整填写每个时段'); return; }
    }

    if (prizes.length === 0) { showError('请至少添加一个奖品'); return; }
    const slotCount = timeSlots.length;
    for (const prize of prizes) {
      if (!prize.name.trim()) { showError('请填写每个奖品的名称'); return; }
      if (!prize.icon) { showError(`请上传奖品"${prize.name}"的图标`); return; }
      if (isCoins(prize.prize_type) && (!prize.amount || prize.amount <= 0)) {
        showError(`请填写奖品"${prize.name}"的金额`); return;
      }
      if (!prize.total_count || prize.total_count <= 0) {
        showError(`请填写奖品"${prize.name}"的数量`); return;
      }
      if (isVoucherType(prize.prize_type)) {
        const libIdx = getVoucherLibIdx(prize.prize_type);
        if (libIdx < 0 || libIdx >= voucherLibraries.length) {
          showError(`奖品"${prize.name}"的券码库选择无效`); return;
        }
        const lib = voucherLibraries[libIdx];
        const remaining = lib.total_count - lib.used_count;
        const totalNeeded = prize.total_count * slotCount;
        if (totalNeeded > remaining) {
          showError(
            `奖品"${prize.name}"每个时段需${prize.total_count}张 × ${slotCount}个时段 = 共需${totalNeeded}张，券码库"${lib.name}"仅剩${remaining}张`
          ); return;
        }
      }
    }

    const dateStr = lotteryDate.format('YYYY-MM-DD');
    if (existingConfigs?.some(c => c.date === dateStr)) {
      showError(`日期 ${dateStr} 已配置过抽奖，请勿重复添加`); return;
    }

    setLoading(true);
    const poolConfigs: LotteryPoolConfig[] = [];
    const programName = '广播节目';
    const voucherDeductions: Record<number, string[]> = {};

    try {
      for (const slot of timeSlots) {
        const timeRange = `${slot.start}-${slot.end}`;
        const poolName = `${programName}${lotteryDate.format('YYYY/M/D')}抽奖（${timeRange}）`;
        const poolStart = dayjs(`${dateStr}T${slot.start}:00`);
        const poolEnd = dayjs(`${dateStr}T${slot.end}:00`);

        const poolRes: any = await lotteryApi.createPool({
          name: poolName, pool_type: 0, description: '', icon: '', image: '',
          start_time: dayjsToApi(poolStart), end_time: dayjsToApi(poolEnd),
        });
        const poolId = poolRes?.id;
        if (!poolId) throw new Error(`创建奖池"${poolName}"失败`);

        const prizeConfigs: LotteryPrizeConfig[] = [];

        for (const prize of prizes) {
          const actualType = getPrizeType(prize.prize_type);
          const isVoucher = isVoucherType(prize.prize_type);
          const libIdx = getVoucherLibIdx(prize.prize_type);
          const lib = isVoucher && libIdx >= 0 ? voucherLibraries[libIdx] : null;
          const count = prize.total_count!;

          let voucherCodes: string[] = [];
          if (isVoucher && lib) {
            const existingClaimed = voucherDeductions[libIdx] || [];
            const available = lib.codes.filter(c => !existingClaimed.includes(c));
            voucherCodes = available.slice(0, count);
            if (voucherCodes.length < count) {
              throw new Error(`券码库"${lib.name}"可用券码不足`);
            }
            voucherDeductions[libIdx] = [...existingClaimed, ...voucherCodes];
          }

          const prizePayload: any = {
            name: prize.name,
            prize_type: actualType,
            amount: isCoins(prize.prize_type) ? Math.round((prize.amount || 0) * 100) : 0,
            description: lib ? lib.description || '' : '',
            icon: prize.icon,
            image: '',
          };

          const prizeRes: any = await lotteryApi.createPrize(poolId, prizePayload);
          const prizeId = prizeRes?.id;
          if (!prizeId) throw new Error(`创建奖品"${prize.name}"失败`);

          await lotteryApi.deployPrize(prizeId, {
            total_count: count,
            voucher_codes: voucherCodes,
            enabled_at: poolStart.unix(),
            start_time: dayjsToApi(poolStart),
            end_time: dayjsToApi(poolEnd),
          });

          prizeConfigs.push({
            name: prize.name,
            type: actualType,
            icon: prize.icon,
            amount: isCoins(prize.prize_type) ? prize.amount : undefined,
            quantity: count,
          });
        }

        poolConfigs.push({ id: poolId, timeRange, prizes: prizeConfigs });
      }

      const updatedLibraries = voucherLibraries.map((lib, i) => {
        const claimed = voucherDeductions[i];
        if (!claimed || claimed.length === 0) return lib;
        const claimedSet = new Set(claimed);
        return {
          ...lib,
          used_count: lib.used_count + claimed.length,
          codes: lib.codes.filter(c => !claimedSet.has(c)),
        };
      });
      onVoucherUpdate(updatedLibraries);

      const newConfig: LotteryConfig = { date: dateStr, pools: poolConfigs };
      onSuccess([...(existingConfigs || []), newConfig]);
      success('抽奖配置完成');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || err?.response?.data?.message || '抽奖配置操作失败，请重试');
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ScrollableModal
      title="新增抽奖配置"
      open={visible}
      onCancel={onClose}
      width={700}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>确认提交</Button>
        </Space>
      }
    >
      {/* 抽奖日期 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>抽奖日期</div>
        <DatePicker value={lotteryDate} onChange={d => setLotteryDate(d)} style={{ width: '100%' }} format="YYYY/MM/DD" />
      </div>

      {/* 抽奖时段 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>抽奖时段</span>
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAddSlot}>添加时段</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {timeSlots.map(slot => (
            <Space key={slot.key} size={8} align="center">
              <TimePicker format="HH:mm" value={slot.start ? dayjs(slot.start, 'HH:mm') : null}
                onChange={t => handleSlotChange(slot.key, 'start', t ? t.format('HH:mm') : '')} style={{ width: 130 }} />
              <span>-</span>
              <TimePicker format="HH:mm" value={slot.end ? dayjs(slot.end, 'HH:mm') : null}
                onChange={t => handleSlotChange(slot.key, 'end', t ? t.format('HH:mm') : '')} style={{ width: 130 }} />
              {timeSlots.length > 1 && (
                <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleRemoveSlot(slot.key)} />
              )}
            </Space>
          ))}
        </div>
      </div>

      {/* 奖品列表 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Space size={8}>
            <span style={{ fontWeight: 500 }}>抽奖奖品</span>
            <span style={{ fontSize: 12, color: '#999' }}>以上每个时段统一配置</span>
          </Space>
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAddPrize}>添加奖品</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {prizes.map((prize) => {
            const voucherLib = isVoucherType(prize.prize_type) ? voucherLibraries[getVoucherLibIdx(prize.prize_type)] : null;
            const remaining = voucherLib ? voucherLib.total_count - voucherLib.used_count : null;
            const maxPerSlot = remaining != null ? Math.floor(remaining / timeSlots.length) : undefined;

            return (
            <div key={prize.key} style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16, background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 500 }}>奖品 #{prizes.indexOf(prize) + 1}</span>
                <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemovePrize(prize.key)}>删除</Button>
              </div>

              {/* 第1行：奖品类型 + 金额/券码来源 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Form.Item label="奖品类型" required style={{ marginBottom: 12 }}>
                  <Select
                    value={isVoucherType(prize.prize_type) ? 2000 : prize.prize_type}
                    onChange={v => {
                      if (v === 2000) return;
                      handlePrizeChange(prize.key, 'prize_type', v);
                      if (DEFAULT_ICONS[v as number]) {
                        handlePrizeChange(prize.key, 'icon', DEFAULT_ICONS[v as number]);
                      }
                    }}
                    options={[
                      { label: '红包', value: PrizeType.COINS },
                      { label: '券码', value: 2000 },
                      ...voucherOptions.map(o => ({ label: `　${o.label}`, value: o.value, disabled: o.disabled })),
                      { label: '实物', value: PrizeType.PHYSICAL },
                    ]}
                  />
                </Form.Item>

                {isCoins(prize.prize_type) && (
                  <Form.Item label="金额（元）" required style={{ marginBottom: 12 }}>
                    <InputNumber min={0.01} precision={2} style={{ width: '100%' }} prefix="¥"
                      value={prize.amount} onChange={v => handlePrizeChange(prize.key, 'amount', v)} />
                  </Form.Item>
                )}

                {isVoucherType(prize.prize_type) && (
                  <Form.Item label="券码来源" style={{ marginBottom: 12 }}>
                    <Input value={voucherOptions.find(o => o.value === prize.prize_type)?.label || ''} disabled />
                  </Form.Item>
                )}
              </div>

              {/* 第2行：奖品名称（自动填充）+ 数量 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Form.Item label="奖品名称" required style={{ marginBottom: 12 }}>
                  <Input value={prize.name}
                    onChange={e => handlePrizeChange(prize.key, 'name', e.target.value)}
                    placeholder={isCoins(prize.prize_type) ? '输入金额后自动填充' : isVoucherType(prize.prize_type) ? '选择券码库后自动填充' : '如：iPhone 16'}
                    maxLength={64} />
                </Form.Item>

                <Form.Item label="数量" required style={{ marginBottom: 12 }}
                  extra={maxPerSlot != null ? <span style={{ fontSize: 12 }}>每时段≤{maxPerSlot}，{timeSlots.length}时段共需{(prize.total_count || 0) * timeSlots.length}张</span> : undefined}
                >
                  <InputNumber min={1} max={maxPerSlot} precision={0} style={{ width: '100%' }}
                    value={prize.total_count} onChange={v => handlePrizeChange(prize.key, 'total_count', v)} />
                </Form.Item>
              </div>

              <Form.Item label="奖品图标" required style={{ marginBottom: 0 }} extra="建议尺寸：200 × 200 像素">
                <CropperImageUpload aspect={1} sizeHint="建议尺寸：200 × 200 像素"
                  value={prize.icon} onChange={v => handlePrizeChange(prize.key, 'icon', v)} />
              </Form.Item>
            </div>
            );
          })}
        </div>
      </div>
    </ScrollableModal>

      <Modal title="操作失败" open={errorModalVisible}
        onCancel={() => setErrorModalVisible(false)}
        footer={<Button type="primary" onClick={() => setErrorModalVisible(false)}>确定</Button>}
        maskClosable={false}>
        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{errorMessage}</p>
      </Modal>
    </>
  );
};

export default ProgramLotteryModal;
