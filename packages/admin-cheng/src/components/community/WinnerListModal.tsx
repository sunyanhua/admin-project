import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Avatar } from 'antd';
import { FormOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PrizeType } from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { lotteryApi, UserPrize } from '@/api/services/lottery';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ScrollableModal from '@/components/templates/ScrollableModal';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
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
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');

  const fetchWinners = useCallback(async (params: any) => {
    return lotteryApi.getUserPrizes({
      page: params.page, size: params.page_size,
      pool_id: poolId, keyword: params.keyword,
    });
  }, [poolId]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    return { list, count: Array.isArray(res) ? res.length : (res?.total ?? 0) };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<UserPrize>({
    fetchFn: fetchWinners, formatResponse, dependencies: [poolId],
  });

  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${visible}-${poolId}`;
    if (visible && poolId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setSearchValues({});
      search({ _t: Date.now() });
    }
  }, [visible, poolId, search]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleShip = (r: UserPrize) => { setShipRecord(r); setShipModalVisible(true); };

  const filters: FilterConfig[] = [
    { name: 'keyword', placeholder: '搜索用户ID', type: 'input' },
  ];

  const columns: ColumnsType<UserPrize> = [
    {
      title: '用户',
      key: 'user',
      width: 160,
      render: (_: any, r: UserPrize) => {
        const up = r.user_profile;
        const nickname = up?.nickname || r.user_id;
        const avatar = up?.avatar || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            onClick={() => { setUserDetailUserId(r.user_id); setUserDetailVisible(true); }}>
            <Space size={4}>
              <Avatar size={40} style={{ borderRadius: '50%', flexShrink: 0 }}
                src={getAvatarUrl(avatar)} />
              <span style={{ fontSize: 14 }}>{nickname}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '奖品',
      key: 'prize',
      width: 160,
      render: (_: any, r: UserPrize) => (
        <span style={{ wordBreak: 'break-word' }}>{r.prize_name || '-'}</span>
      ),
    },
    dateTimeColumn<UserPrize>('won_at', '中奖时间'),
    {
      title: '操作', key: 'action', width: 100, fixed: 'right' as const,
      render: (_: any, r: UserPrize) => (
        <Space size="small" className="action-buttons">
          {r.prize_type === PrizeType.PHYSICAL && (
            <Button type="link" size="small" icon={<FormOutlined />} onClick={() => handleShip(r)}>发货</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ScrollableModal
        title={`中奖名单 - ${poolName}`}
        open={visible}
        onCancel={onClose}
        width={800}
        footer={false}
      >
        <div>
          <div style={{ marginBottom: 12 }}>
            <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
          </div>
          <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
        </div>
      </ScrollableModal>

      <UserPrizeShipModal visible={shipModalVisible} record={shipRecord}
        onClose={() => setShipModalVisible(false)} onSuccess={refresh} />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </>
  );
};

export default WinnerListModal;
