import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space } from 'antd';
import { EditOutlined, UndoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  ApplicationReviewStatus,
  ApplicationReviewStatusColors,
} from '@shared/constants';
import { zoneApi, Application } from '@/api/services/zone';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn, statusTagColumn } from '@/components/templates/ColumnHelpers';
import ScrollableModal from '@/components/templates/ScrollableModal';
import ZoneApplicationReviewModal from '@/components/operation/ZoneApplicationReviewModal';

const STATUS_OPTIONS = [
  { label: '待审核', value: ApplicationReviewStatus.PENDING },
  { label: '已通过', value: ApplicationReviewStatus.APPROVED },
  { label: '已拒绝', value: ApplicationReviewStatus.REJECTED },
  { label: '已撤销', value: ApplicationReviewStatus.REVOKED },
];

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  [ApplicationReviewStatus.PENDING]: { text: '待审核', color: ApplicationReviewStatusColors[ApplicationReviewStatus.PENDING] },
  [ApplicationReviewStatus.APPROVED]: { text: '通过', color: ApplicationReviewStatusColors[ApplicationReviewStatus.APPROVED] },
  [ApplicationReviewStatus.REJECTED]: { text: '拒绝', color: ApplicationReviewStatusColors[ApplicationReviewStatus.REJECTED] },
  [ApplicationReviewStatus.REVOKED]: { text: '已撤销', color: ApplicationReviewStatusColors[ApplicationReviewStatus.REVOKED] },
};

interface ZoneVerifyModalProps {
  visible: boolean;
  zoneId: string;
  zoneName: string;
  onClose: () => void;
}

const ZoneVerifyModal: React.FC<ZoneVerifyModalProps> = ({ visible, zoneId, zoneName, onClose }) => {
  const { success, error: showError } = useAppNotification();
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({ status: '' });

  const fetchApps = useCallback(async (params: any) => {
    if (!zoneId) return { list: [], total: 0 };
    return zoneApi.getApplications(zoneId, {
      page: params.page, size: params.page_size,
    });
  }, [zoneId]);

  const formatAppResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    let filtered = list;
    if (searchValues.status !== '' && searchValues.status != null) {
      filtered = list.filter((item: Application) => item.status === searchValues.status);
    }
    return { list: filtered, count: searchValues.status !== '' && searchValues.status != null ? filtered.length : total };
  }, [searchValues.status]);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Application>({
    fetchFn: fetchApps, formatResponse: formatAppResponse,
  });

  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${visible}-${zoneId}`;
    if (visible && zoneId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setSearchValues({ status: '' });
      search({ _t: Date.now(), status: '' });
    }
  }, [visible, zoneId, search]);

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues(p => ({ ...p, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({ status: '' }); search({ status: '' }); };

  const handleReview = (record: Application) => {
    setSelectedApp(record);
    setReviewModalVisible(true);
  };

  const handleRevoke = async (record: Application) => {
    try {
      await zoneApi.revokeApplication(record.zone_id, record.id);
      success('已撤销');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    }
  };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  ];

  const columns: ColumnsType<Application> = [
    { title: '用户ID', dataIndex: 'user_id', key: 'user_id', width: 160 },
    statusTagColumn<Application>('status', STATUS_MAP, '审核状态', 100),
    { title: '审核备注', dataIndex: 'review_remark', key: 'review_remark',
      render: (text: string) => (
        text ? <span style={{ wordBreak: 'break-word' }}>{text}</span> : <span style={{ color: '#999' }}>-</span>
      ),
    },
    dateTimeColumn<Application>('created_at', '申请时间'),
    {
      title: '操作', key: 'action', width: 140, fixed: 'right' as const,
      render: (_: any, record: Application) => (
        <Space size="small" className="action-buttons">
          {record.status === ApplicationReviewStatus.PENDING && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleReview(record)}>审核</Button>
          )}
          {record.status === ApplicationReviewStatus.APPROVED && (
            <Button type="link" size="small" danger icon={<UndoOutlined />} onClick={() => handleRevoke(record)}>撤销</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ScrollableModal
        title={`用户认证 - ${zoneName}`}
        open={visible}
        onCancel={onClose}
        width={900}
        footer={false}
      >
        <div style={{ marginBottom: 12 }}>
          <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        </div>
        <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      </ScrollableModal>

      <ZoneApplicationReviewModal
        visible={reviewModalVisible}
        zoneId={zoneId}
        application={selectedApp}
        onClose={() => { setReviewModalVisible(false); setSelectedApp(null); }}
        onSuccess={refresh}
      />
    </>
  );
};

export default ZoneVerifyModal;
