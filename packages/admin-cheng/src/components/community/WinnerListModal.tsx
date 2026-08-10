import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PrizeTypeLabels, PrizeTypeColors, ShipStatusLabels, ShipStatusColors } from '@shared/constants';
import { lotteryApi, UserPrize } from '@/api/services/lottery';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ScrollableModal from '@/components/templates/ScrollableModal';
import UserPrizeShipModal from '@/components/community/UserPrizeShipModal';

interface WinnerListModalProps {
  visible: boolean;
  poolId: string;
  poolName: string;
  onClose: () => void;
}

const WinnerListModal: React.FC<WinnerListModalProps> = ({ visible, poolId, poolName, onClose }) => {
  const [shipModalVisible, setShipModalVisible] = useState(false);
  const [shipRecord, setShipRecord] = useState<UserPrize | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchWinners = useCallback(async (params: any) => {
    return lotteryApi.getUserPrizes({
      page: params.page, size: params.page_size, keyword: params.keyword,
    });
  }, []);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    return { list, count: Array.isArray(res) ? res.length : (res?.total ?? 0) };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<UserPrize>({
    fetchFn: fetchWinners, formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };
  const handleShip = (r: UserPrize) => { setShipRecord(r); setShipModalVisible(true); };

  const filters: FilterConfig[] = [
    { name: 'keyword', placeholder: '搜索用户ID', type: 'input' },
  ];

  const columns: ColumnsType<UserPrize> = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 160 },
    { title: '奖品', key: 'prize', width: 140,
      render: (_: any, r: UserPrize) => (
        <span style={{ wordBreak: 'break-word' }}>{(r as any).prize_name || '-'}</span>
      ) },
    { title: '类型', dataIndex: 'prize_type', key: 'prize_type', width: 80,
      render: (v: number) => <Tag color={PrizeTypeColors[v] || 'default'}>{PrizeTypeLabels[v] ?? v}</Tag> },
    { title: '价值', dataIndex: 'amount', key: 'amount', width: 80, render: (v: number) => v ?? 0 },
    { title: '发货', dataIndex: 'ship_status', key: 'ship_status', width: 90,
      render: (v: number | null) => v != null ? <Tag color={ShipStatusColors[v]}>{ShipStatusLabels[v]}</Tag> : '-' },
    dateTimeColumn<UserPrize>('won_at', '中奖时间'),
    { title: '操作', key: 'action', width: 100, fixed: 'right' as const,
      render: (_: any, r: UserPrize) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<FormOutlined />} onClick={() => handleShip(r)}>发货</Button>
        </Space>
      ),
    },
  ];

  return (
    <ScrollableModal
      title={`中奖名单 - ${poolName}`}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={false}
    >
      <div>
        <div style={{ marginBottom: 12 }}>
          <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        </div>
        <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      </div>

      <UserPrizeShipModal visible={shipModalVisible} record={shipRecord}
        onClose={() => setShipModalVisible(false)} onSuccess={refresh} />
    </ScrollableModal>
  );
};

export default WinnerListModal;
