import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Avatar } from 'antd';
import { EditOutlined, UndoOutlined, ReloadOutlined, EyeOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import {
  ApplicationReviewStatus,
  ApplicationReviewStatusColors,
  ApplicationReviewStatusLabels,
  RegisterGenderLabels,
} from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { zoneApi, Application } from '@/api/services/zone';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn, statusTagColumn } from '@/components/templates/ColumnHelpers';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import RealNameWithTag from '@/components/user/RealNameWithTag';
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
  const [reviewReadonly, setReviewReadonly] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState<string>('');
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [exporting, setExporting] = useState(false);

  const fetchApps = useCallback(async (params: any) => {
    if (!zoneId) return { list: [], total: 0 };
    return zoneApi.getApplications(zoneId, {
      page: params.page, size: params.page_size,
      status: params.status || undefined,
      keyword: params.keyword || undefined,
    });
  }, [zoneId]);

  const formatAppResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Application>({
    fetchFn: fetchApps, formatResponse: formatAppResponse,
  });

  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${visible}-${zoneId}`;
    if (visible && zoneId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setSearchValues({});
      search({ _t: Date.now() });
    }
  }, [visible, zoneId, search]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const allData: Application[] = [];
      let page = 1;
      while (true) {
        const res: any = await zoneApi.getApplications(zoneId, { page, size: 100 });
        const list: Application[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        allData.push(...list);
        if (list.length < 100) break;
        page++;
      }
      const zoneRes: any = await zoneApi.getDetail(zoneId);
      const zoneData = zoneRes as any;
      let formFields: Array<{ id: string; label: string }> = [];
      try {
        const fc = typeof zoneData?.form_config === 'string' ? JSON.parse(zoneData.form_config) : zoneData?.form_config;
        if (Array.isArray(fc)) formFields = fc.map((f: any) => ({ id: f.id, label: f.label }));
      } catch { /* ignore */ }
      const headers = ['用户名', '姓名', '性别', '手机号', '认证状态', '拒绝原因', '申请时间'];
      formFields.forEach(f => headers.push(f.label));
      const rows: string[][] = [];
      for (const item of allData) {
        const profile = item.user_profile;
        const mp = item.user_match_profile as any;
        const nickname = profile?.nickname || item.user_id;
        const gender = profile?.gender != null ? (RegisterGenderLabels[profile.gender] ?? String(profile.gender)) : '';
        const phone = (item.user_data as any)?.phone || mp?.phone || '';
        const name = mp?.real_name || '';
        const statusText = ApplicationReviewStatusLabels[item.status] || String(item.status);
        const remark = item.review_remark || '';
        let formDataMap: Record<string, any> = {};
        try { formDataMap = JSON.parse(item.form_data || '{}'); } catch { /* ignore */ }
        const createdAt = item.created_at ? item.created_at.replace('T', ' ').substring(0, 19) : '';
        const attsByField: Record<string, string[]> = {};
        for (const att of (item.attachments || [])) {
          const tag = (att as any).tags || '';
          if (!attsByField[tag]) attsByField[tag] = [];
          attsByField[tag].push(att.url);
        }
        const row = [nickname, name, gender, phone, statusText, remark, createdAt];
        formFields.forEach(f => {
          const val = formDataMap[f.id];
          const urls = attsByField[f.id] || [];
          const parts: string[] = [];
          if (val != null) parts.push(String(val));
          parts.push(...urls);
          row.push(parts.join(', '));
        });
        rows.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '用户认证');
      XLSX.writeFile(wb, `${zoneName}_认证申请.xlsx`);
      success('导出成功');
    } catch (err: any) {
      showError(err?.response?.data?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleReview = (record: Application) => {
    setSelectedApp(record);
    setReviewReadonly(false);
    setReviewModalVisible(true);
  };

  const handleView = (record: Application) => {
    setSelectedApp(record);
    setReviewReadonly(true);
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
    { name: 'keyword', placeholder: '搜索用户名/昵称', type: 'input' },
  ];

  const columns: ColumnsType<Application> = [
    {
      title: '用户名',
      key: 'user',
      width: 160,
      render: (_: any, r: Application) => {
        const profile = r.user_profile;
        const nickname = profile?.nickname || r.user_id;
        const avatar = profile?.avatar || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            onClick={() => { setUserDetailUserId(r.user_id); setUserDetailVisible(true); }}>
            <Space size={4}>
              <Avatar size={40} style={{ borderRadius: '50%', flexShrink: 0 }} src={getAvatarUrl(avatar)} />
              <span style={{ fontSize: 14 }}>{nickname}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '姓名',
      key: 'real_name',
      width: 100,
      render: (_: any, r: Application) => (
        <RealNameWithTag name={r.user_match_profile?.real_name} verified={r.user_match_profile?.is_real_verified} />
      ),
    },
    {
      title: '性别',
      key: 'gender',
      width: 70,
      render: (_: any, r: Application) => {
        const g = r.user_profile?.gender;
        return g != null ? (RegisterGenderLabels[g] ?? g) : '-';
      },
    },
    {
      title: '手机号',
      key: 'phone',
      width: 130,
      render: (_: any, r: Application) => {
        const phone = (r.user_data as any)?.phone || (r.user_match_profile as any)?.phone;
        return phone || <span style={{ color: '#999' }}>-</span>;
      },
    },
    statusTagColumn<Application>('status', STATUS_MAP, '认证状态', 100),
    dateTimeColumn<Application>('created_at', '申请时间'),
    {
      title: '操作', key: 'action', width: 140, fixed: 'right' as const,
      render: (_: any, record: Application) => (
        <Space size="small" className="action-buttons">
          {record.status === ApplicationReviewStatus.PENDING && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleReview(record)}>审核</Button>
          )}
          {record.status === ApplicationReviewStatus.APPROVED && (
            <>
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
              <Button type="link" size="small" danger icon={<UndoOutlined />} onClick={() => handleRevoke(record)}>撤销</Button>
            </>
          )}
          {record.status === ApplicationReviewStatus.REJECTED && (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
          )}
          {record.status === ApplicationReviewStatus.REVOKED && (
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
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
        width={1100}
        footer={false}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
          <Space style={{ marginLeft: 12, flexShrink: 0 }}>
            <Button icon={<ExportOutlined />} loading={exporting} onClick={handleExport}>导出</Button>
            <Button icon={<ReloadOutlined />} onClick={() => search({ _t: Date.now() })}>刷新</Button>
          </Space>
        </div>
        <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      </ScrollableModal>

      <ZoneApplicationReviewModal
        visible={reviewModalVisible}
        zoneId={zoneId}
        application={selectedApp}
        readonly={reviewReadonly}
        onClose={() => { setReviewModalVisible(false); setSelectedApp(null); setReviewReadonly(false); }}
        onSuccess={refresh}
      />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </>
  );
};

export default ZoneVerifyModal;
