import React, { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Card, Tabs, Form, Button, Input, Typography, Space, Spin, Tag, Modal, Image } from 'antd';
import { SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined, QrcodeOutlined } from '@ant-design/icons';
import SourceQrcodeModal from '@/components/common/SourceQrcodeModal';
import { PrizeTypeColors } from '@shared/constants';
import { settingsApi, SettingType } from '@/api/services/settings';
import { getSmallUrl } from '@/utils/imageUtils';
import ImageUpload from '@/components/common/ImageUpload';
import ProgramLotteryModal, { LotteryConfig } from '@/components/operation/ProgramLotteryModal';
import VoucherLibraryModal, { VoucherLibraryItem } from '@/components/operation/VoucherLibraryModal';

interface BroadcastData {
  image: string;
  listen_url: string;
  lottery: LotteryConfig[];
}

interface VoucherData {
  libraries: VoucherLibraryItem[];
}

const EMPTY_BROADCAST: BroadcastData = { image: '', listen_url: '', lottery: [] };
const EMPTY_VOUCHER: VoucherData = { libraries: [] };

const ProgramManagement: React.FC = () => {
  const { success, error: showError } = useAppNotification();
  const [activeTab, setActiveTab] = useState('broadcast');

  // 广播 tab
  const [broadcastData, setBroadcastData] = useState<BroadcastData>(EMPTY_BROADCAST);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastSaving, setBroadcastSaving] = useState(false);
  const [broadcastSettingId, setBroadcastSettingId] = useState('');
  const [lotteryModalVisible, setLotteryModalVisible] = useState(false);
  const [copyLotteryConfig, setCopyLotteryConfig] = useState<LotteryConfig | null>(null);

  // 券码 tab
  const [voucherData, setVoucherData] = useState<VoucherData>(EMPTY_VOUCHER);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherSettingId, setVoucherSettingId] = useState('');
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [voucherModalMode, setVoucherModalMode] = useState<'create' | 'edit'>('create');
  const [editingVoucher, setEditingVoucher] = useState<VoucherLibraryItem | null>(null);

  const fetchBroadcast = useCallback(async () => {
    setBroadcastLoading(true);
    try {
      const res: any = await settingsApi.getSettings({ keyword: 'broadcast', size: 100 });
      const list = res?.list || [];
      const item = list.find((s: any) => s.key === 'program_broadcast');
      if (item) {
        setBroadcastSettingId(item.id);
        try {
          const parsed = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
          setBroadcastData({
            image: parsed.image || '',
            listen_url: parsed.listen_url || '',
            lottery: parsed.lottery || [],
          });
        } catch {
          setBroadcastData(EMPTY_BROADCAST);
        }
      } else {
        setBroadcastSettingId('');
        setBroadcastData(EMPTY_BROADCAST);
      }
    } catch {
      setBroadcastData(EMPTY_BROADCAST);
    } finally {
      setBroadcastLoading(false);
    }
  }, []);

  const fetchVoucher = useCallback(async () => {
    setVoucherLoading(true);
    try {
      const res: any = await settingsApi.getSettings({ keyword: 'voucher', size: 100 });
      const list = res?.list || [];
      const item = list.find((s: any) => s.key === 'program_voucher_library');
      if (item) {
        setVoucherSettingId(item.id);
        try {
          const parsed = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
          setVoucherData({ libraries: parsed.libraries || [] });
        } catch {
          setVoucherData(EMPTY_VOUCHER);
        }
      } else {
        setVoucherSettingId('');
        setVoucherData(EMPTY_VOUCHER);
      }
    } catch {
      setVoucherData(EMPTY_VOUCHER);
    } finally {
      setVoucherLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcast();
    fetchVoucher();
  }, [fetchBroadcast, fetchVoucher]);

  // === 广播：自动保存到 Setting ===
  const saveBroadcastToSetting = async (data: BroadcastData, id: string) => {
    const value = JSON.stringify(data);
    try {
      if (id) {
        await settingsApi.updateSetting(id, { value });
      } else {
        const createRes: any = await settingsApi.createSetting({
          key: 'program_broadcast',
          type: SettingType.JSON,
          value,
          group_name: 'program',
        });
        if (createRes?.id) setBroadcastSettingId(createRes.id);
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    }
  };

  // === 券码：自动保存到 Setting ===
  const saveVoucherToSetting = async (libraries: VoucherLibraryItem[], id: string) => {
    const value = JSON.stringify({ libraries });
    try {
      if (id) {
        await settingsApi.updateSetting(id, { value });
      } else {
        const createRes: any = await settingsApi.createSetting({
          key: 'program_voucher_library',
          type: SettingType.JSON,
          value,
          group_name: 'program',
        });
        if (createRes?.id) setVoucherSettingId(createRes.id);
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    }
  };

  // 新增 / 编辑 → 更新 state 并自动保存
  const handleVoucherSuccess = (item: VoucherLibraryItem, mode: 'create' | 'edit') => {
    const updated = mode === 'create'
      ? [...voucherData.libraries, item]
      : voucherData.libraries.map(lib =>
          lib.name === editingVoucher?.name && lib.total_count === editingVoucher?.total_count
            && JSON.stringify(lib.codes) === JSON.stringify(editingVoucher?.codes) ? item : lib
        );
    setVoucherData({ libraries: updated });
    saveVoucherToSetting(updated, voucherSettingId);
    success(mode === 'create' ? '券码库已添加' : '券码库已更新');
  };

  // 抽奖消耗券码后批量更新券码库
  const handleVoucherBatchUpdate = (libraries: VoucherLibraryItem[]) => {
    setVoucherData({ libraries });
    saveVoucherToSetting(libraries, voucherSettingId);
  };

  // 删除
  const handleDeleteVoucher = (idx: number) => {
    const target = voucherData.libraries[idx];
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除券码库"${target.name}"吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      maskClosable: false,
      onOk: async () => {
        const updated = voucherData.libraries.filter((_, i) => i !== idx);
        setVoucherData({ libraries: updated });
        await saveVoucherToSetting(updated, voucherSettingId);
        success('券码库已删除');
      },
    });
  };

  const handleAddVoucher = () => {
    setEditingVoucher(null);
    setVoucherModalMode('create');
    setVoucherModalVisible(true);
  };

  const handleEditVoucher = (idx: number) => {
    setEditingVoucher(voucherData.libraries[idx]);
    setVoucherModalMode('edit');
    setVoucherModalVisible(true);
  };

  // === 抽奖：复制 / 删除 ===
  const handleCopyLottery = (config: LotteryConfig) => {
    setCopyLotteryConfig(config);
    setLotteryModalVisible(true);
  };

  const handleDeleteLottery = (dateStr: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 ${dateStr} 的抽奖配置吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      maskClosable: false,
      onOk: () => {
        const updated = broadcastData.lottery.filter(c => c.date !== dateStr);
        const newData = { ...broadcastData, lottery: updated };
        setBroadcastData(newData);
        saveBroadcastToSetting(newData, broadcastSettingId);
        success('已删除');
      },
    });
  };

  // ========== 渲染 ==========

  const renderBroadcastTab = () => (
    <Spin spinning={broadcastLoading}>
      <Form layout="vertical" style={{ maxWidth: 800 }}>
        <Form.Item label="节目图片" extra="建议尺寸：1080 × 540 像素">
          <ImageUpload
            value={broadcastData.image}
            onChange={url => setBroadcastData(prev => ({ ...prev, image: url }))}
          />
        </Form.Item>

        <Form.Item label="节目收听地址">
          <Input
            value={broadcastData.listen_url}
            onChange={e => setBroadcastData(prev => ({ ...prev, listen_url: e.target.value }))}
            placeholder="请输入节目收听地址 URL"
          />
        </Form.Item>

        <Form.Item
          label={
            <span>
              节目抽奖
              <Button type="primary" size="small" icon={<PlusOutlined />}
                onClick={() => setLotteryModalVisible(true)}
                style={{ marginLeft: 12 }}>
                新增配置
              </Button>
            </span>
          }
        >
          {broadcastData.lottery.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#999', background: '#fafafa', borderRadius: 8, border: '1px dashed #e8e8e8' }}>
              暂无抽奖配置，点击"新增配置"添加
            </div>
          ) : (
            <>
            <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 12, background: '#f5f5f5', borderTop: '1px solid #e8e8e8', borderBottom: '1px solid #e8e8e8' }}>
              {[...broadcastData.lottery].sort((a, b) => b.date.localeCompare(a.date)).map(config => (
                <Card key={config.date} size="small"
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14 }}>抽奖日期：{config.date}</span>
                      <Space size={4}>
                        <Button type="link" size="small" icon={<CopyOutlined />}
                          onClick={() => handleCopyLottery(config)}>复制</Button>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}
                          onClick={() => handleDeleteLottery(config.date)}>删除</Button>
                      </Space>
                    </div>
                  }>
                  {config.pools.map(pool => (
                    <div key={pool.id} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '3px solid #1890ff' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                        时段：{pool.timeRange}
                      </div>
                      <Space size={4} wrap>
                        {pool.prizes.map((prize, idx) => (
                          <Tag key={idx} color={PrizeTypeColors[prize.type] || 'default'}>
                            {prize.name}
                            <span style={{ marginLeft: 4 }}>
                              {prize.type === 1 && prize.amount != null ? `¥${prize.amount} ` : ''}
                              ×{prize.quantity}
                            </span>
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  ))}
                </Card>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>新增节目抽奖配置后将自动同步创建奖池</div>
            </>
          )}
        </Form.Item>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" icon={<SaveOutlined />} loading={broadcastSaving} onClick={async () => {
              setBroadcastSaving(true);
              await saveBroadcastToSetting(broadcastData, broadcastSettingId);
              setBroadcastSaving(false);
              success('保存成功');
            }}>
              保存
            </Button>
            <SourceQrcodeModal basePage="pages/program/index">
              <Button icon={<QrcodeOutlined />}>小程序码</Button>
            </SourceQrcodeModal>
          </Space>
        </Form.Item>
      </Form>
    </Spin>
  );

  const renderVoucherTab = () => (
    <Spin spinning={voucherLoading}>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVoucher}>
            新增券码库
          </Button>
        </div>

        {voucherData.libraries.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#999', background: '#fafafa', borderRadius: 8, border: '1px dashed #e8e8e8' }}>
            暂无券码库，点击"新增券码库"添加
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500 }}>券码库</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, width: 160 }}>说明</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, width: 80 }}>总数</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, width: 80 }}>已用</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, width: 80 }}>剩余</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 500, width: 140 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {voucherData.libraries.map((lib, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <Space size={8}>
                      {lib.icon && (
                        <Image src={getSmallUrl(lib.icon)} alt={lib.name} preview={{ src: lib.icon }}
                          style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                      )}
                      <span style={{ wordBreak: 'break-word' }}>{lib.name}</span>
                    </Space>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 13, color: '#666', wordBreak: 'break-word' }}>
                      {lib.description || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>{lib.total_count}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: lib.used_count > 0 ? '#1677ff' : undefined }}>
                    {lib.used_count}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: (lib.total_count - lib.used_count) > 0 ? '#52c41a' : '#ff4d4f' }}>
                    {lib.total_count - lib.used_count}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <Space size="small" className="action-buttons" style={{ justifyContent: 'center', width: '100%' }}>
                      <Button type="link" size="small" icon={<EditOutlined />}
                        onClick={() => handleEditVoucher(idx)}>编辑</Button>
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}
                        onClick={() => handleDeleteVoucher(idx)}>删除</Button>
                    </Space>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </Spin>
  );

  const tabItems = [
    { key: 'broadcast', label: '广播', children: renderBroadcastTab() },
    { key: 'voucher', label: '券码库管理', children: renderVoucherTab() },
  ];

  return (
    <div>
      <Typography.Title level={2}>广播节目管理</Typography.Title>
      <p style={{ color: '#666', marginBottom: 24 }}>管理广播节目的图片、收听地址、抽奖配置，以及券码库。</p>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      <ProgramLotteryModal
        visible={lotteryModalVisible}
        onClose={() => { setLotteryModalVisible(false); setCopyLotteryConfig(null); }}
        onSuccess={configs => {
          const newData = { ...broadcastData, lottery: configs };
          setBroadcastData(newData);
          saveBroadcastToSetting(newData, broadcastSettingId);
          setCopyLotteryConfig(null);
        }}
        existingConfigs={broadcastData.lottery}
        voucherLibraries={voucherData.libraries}
        onVoucherUpdate={handleVoucherBatchUpdate}
        copyFrom={copyLotteryConfig}
      />

      <VoucherLibraryModal
        visible={voucherModalVisible}
        mode={voucherModalMode}
        library={editingVoucher}
        onClose={() => { setVoucherModalVisible(false); setEditingVoucher(null); }}
        onSuccess={handleVoucherSuccess}
      />
    </div>
  );
};

export default ProgramManagement;
