import { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Select } from 'antd';
import { EditOutlined, UndoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  ApplicationReviewStatus,
  ApplicationReviewStatusColors,
} from '@shared/constants';
import { zoneApi, Application, Zone } from '@/api/services/zone';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn, statusTagColumn } from '@/components/templates/ColumnHelpers';
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

const ZoneApplicationList = () => {
  const { success, error: showError } = useAppNotification();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({ status: '' });

  // 加载专区列表供下拉选择
  useEffect(() => {
    zoneApi.getList({ page: 1, size: 100 }).then((res: any) => {
      const list = res?.list || [];
      setZones(list);
      if (list.length > 0 && !selectedZoneId) {
        setSelectedZoneId(list[0].id);
      }
    }).catch(() => setZones([]));
  }, []);

  const fetchApps = useCallback(async (params: any) => {
    if (!selectedZoneId) return { list: [], total: 0 };
    return zoneApi.getApplications(selectedZoneId, {
      page: params.page,
      size: params.page_size,
    });
  }, [selectedZoneId]);

  const formatAppResponse = useCallback((res: any) => {
    const list = res?.list || [];
    const total = res?.total ?? 0;
    // 前端按 status 筛选（接口不支持 status 参数）
    let filtered = list;
    if (searchValues.status !== '' && searchValues.status != null) {
      filtered = list.filter((item: Application) => item.status === searchValues.status);
    }
    return { list: filtered, count: searchValues.status !== '' && searchValues.status != null ? filtered.length : total };
  }, [searchValues.status]);

  const {
    data,
    loading: listLoading,
    pagination,
    onPageChange,
    refresh,
    search,
  } = useListPage<Application>({
    fetchFn: fetchApps,
    formatResponse: formatAppResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setSearchValues({ status: '' });
    search({ status: '' });
  };

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

  const handleCloseModal = () => {
    setReviewModalVisible(false);
    setSelectedApp(null);
  };

  const filters: FilterConfig[] = [
    {
      name: 'status',
      placeholder: '全部状态',
      type: 'select',
      options: STATUS_OPTIONS,
    },
  ];

  const columns: ColumnsType<Application> = [
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 160,
    },
    statusTagColumn<Application>('status', STATUS_MAP, '审核状态', 100),
    {
      title: '审核备注',
      dataIndex: 'review_remark',
      key: 'review_remark',
      render: (text: string) => (
        text ? <span style={{ wordBreak: 'break-word' }}>{text}</span> : <span style={{ color: '#999' }}>-</span>
      ),
    },
    dateTimeColumn<Application>('created_at', '申请时间'),
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Application) => (
        <Space size="small" className="action-buttons">
          {record.status === ApplicationReviewStatus.PENDING && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleReview(record)}>
              审核
            </Button>
          )}
          {record.status === ApplicationReviewStatus.APPROVED && (
            <Button type="link" size="small" danger icon={<UndoOutlined />} onClick={() => handleRevoke(record)}>
              撤销
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="专区用户认证"
        description="审核用户提交的专区加入申请，支持通过、拒绝和撤销审核操作。"
        showRefreshButton
        onRefresh={refresh}
        searchArea={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Select
              placeholder="请选择专区"
              value={selectedZoneId || undefined}
              style={{ minWidth: 200 }}
              options={zones.map((z) => ({ label: z.name, value: z.id }))}
              onChange={(val) => { setSelectedZoneId(val); setTimeout(() => refresh(), 0); }}
            />
            <SearchPanel
              filters={filters}
              values={searchValues}
              onChange={handleSearchChange}
              onSearch={handleSearch}
              onReset={handleReset}
            />
          </div>
        }
        table={
          selectedZoneId ? (
            <StandardTable
              columns={columns}
              dataSource={data}
              loading={listLoading}
              pagination={pagination}
              onPageChange={onPageChange}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 14 }}>
              请先选择一个专区，然后查看申请记录
            </div>
          )
        }
      />

      <ZoneApplicationReviewModal
        visible={reviewModalVisible}
        zoneId={selectedZoneId}
        application={selectedApp}
        onClose={handleCloseModal}
        onSuccess={refresh}
      />
    </>
  );
};

export default ZoneApplicationList;
