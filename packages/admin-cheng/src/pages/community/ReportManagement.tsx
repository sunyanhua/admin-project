import { useState, useCallback, useEffect, useRef } from 'react';
import { Tag, Button, Space, Radio, Input, InputNumber, Image } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useListPage } from '@/hooks/useListPage';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import ScrollableModal from '@/components/templates/ScrollableModal';
import UserAvatar from '@/components/user/UserAvatar';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import { getMediumUrl } from '@/utils/imageUtils';
import { formatDateTime } from '@/utils/format';
import { UserGenderLabels } from '@/api/types/status';
import { userApi } from '@/api/services/user';
import {
  reportApi, ReportStatus, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS,
  AdminReportListItem, AdminReportDetailResponse, AdminReportUserCard,
} from '@/api/services/report';

const { TextArea } = Input;

const REPORT_FILTERS: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select',
    options: [
      { label: '待处理', value: ReportStatus.PENDING },
      { label: '已处理', value: ReportStatus.HANDLED },
      { label: '已驳回', value: ReportStatus.REJECTED },
    ],
  },
  { name: 'target_match_code', placeholder: '搜索被举报能成号', type: 'input' },
];

/** 响应结构统一解析（拦截器可能返回 { list, total } 或原始数组） */
const formatResponse = (res: any) => {
  const list = Array.isArray(res) ? res : (res?.list || []);
  const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
  return { list, count: total };
};

/** 举报人/被举报人卡片 */
const UserSideCard: React.FC<{ title: string; card?: AdminReportUserCard }> = ({ title, card }) => (
  <div style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'center', background: '#fafafa' }}>
    <UserAvatar src={card?.avatar} nick={card?.nickname} size={48} />
    <div style={{ minWidth: 0, fontSize: 13 }}>
      <div style={{ fontWeight: 600 }}>{title}：{card?.nickname || '-'}</div>
      <div style={{ color: '#666' }}>能成号：{card?.match_code || '-'}</div>
      <div style={{ color: '#666' }}>性别：{card ? (UserGenderLabels[card.gender] || '-') : '-'}</div>
    </div>
  </div>
);

/** 举报详情弹窗：双方卡片/内容/附件；待处理可处理（意见必填），已处理/已驳回只读展示处理记录 */
const ReportDetailModal: React.FC<{
  open: boolean;
  detail: AdminReportDetailResponse | null;
  loading: boolean;
  onClose: () => void;
  onHandled: () => void;
  onReloadDetail: () => void;
  /** 当前打开凭证 ref（id@token）：异步回调前读取实时值校验，防止旧请求误关新弹窗 */
  activeKeyRef: React.MutableRefObject<string>;
}> = ({ open, detail, loading, onClose, onHandled, onReloadDetail, activeKeyRef }) => {
  const { success, error: showError } = useAppNotification();
  const [action, setAction] = useState(ReportStatus.HANDLED);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /** 已处理时扣除被举报人靠谱值（默认 20，0=不扣；2026-11-15 用户定，参考现场管理未签到扣分） */
  const [deductScore, setDeductScore] = useState(20);
  /** 本次提交是否已执行扣分（处理失败重试时防重复扣分） */
  const [deducted, setDeducted] = useState(false);

  // 打开/切换举报/关闭时重置处理表单，不残留上一条的选择与意见
  useEffect(() => {
    setAction(ReportStatus.HANDLED);
    setRemark('');
    setSubmitting(false);
    setDeductScore(20);
    setDeducted(false);
  }, [open, detail?.id]);

  const handleSubmit = async () => {
    if (!detail) return;
    if (!remark.trim()) {
      showError('请填写处理意见');
      return;
    }
    const id = detail.id;
    const key = activeKeyRef.current;
    setSubmitting(true);
    try {
      // 已处理且需扣分：先扣被举报人靠谱值（0=跳过；被举报人无 user_id 跳过）
      if (action === ReportStatus.HANDLED && deductScore > 0 && !deducted && detail.target_user_id) {
        const reason = `举报处理扣分（能成号 ${detail.target_match_code || '-'}）`;
        try {
          await userApi.adjustReliabilityScore(detail.target_user_id, -deductScore, reason);
          setDeducted(true);
        } catch (err: any) {
          showError(err?.response?.data?.message || '扣分失败，未执行处理');
          return;
        }
      }
      await reportApi.handle(id, { status: action, remark: remark.trim() });
      // 写入已发生：无论弹窗是否仍打开都刷新列表
      onHandled();
      if (activeKeyRef.current === key) {
        success('处理成功');
        onClose();
      }
    } catch (err: any) {
      if (activeKeyRef.current === key) {
        showError(err?.response?.data?.message || '处理失败');
        onReloadDetail(); // 重拉详情同步状态（如他人已处理）
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableModal
      title="举报详情"
      open={open}
      onCancel={onClose}
      width={860}
      footer={false}
    >
      {detail ? (
        <div data-testid="report-detail-section">
          {/* 双方卡片 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <UserSideCard title="举报人" card={detail.reporter} />
            <UserSideCard title="被举报人" card={detail.target} />
          </div>

          {/* 举报内容 */}
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <span style={{ color: '#666' }}>举报内容：</span>
            <span style={{ wordBreak: 'break-word' }}>{detail.content || '-'}</span>
          </div>

          {/* 附件 */}
          {!!detail.attachments?.length && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>举报附件</div>
              <Space size={8} wrap>
                {detail.attachments.map((p, i) => (
                  <Image key={p.media_id || i} src={getMediumUrl(p.url)} preview={{ src: p.url }} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                ))}
              </Space>
            </div>
          )}

          {/* 状态与时间 */}
          <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
            <Tag color={REPORT_STATUS_COLORS[detail.status] || 'default'} title={REPORT_STATUS_LABELS[detail.status]}>
              {REPORT_STATUS_LABELS[detail.status] ?? detail.status}
            </Tag>
            <span style={{ marginLeft: 12 }}>提交时间：{detail.created_at ? formatDateTime(detail.created_at) : '-'}</span>
          </div>

          {/* 处理区：待处理 → 表单；已处理/已驳回 → 只读记录 */}
          {detail.status === ReportStatus.PENDING ? (
            <div data-testid="report-handle-section" style={{ borderTop: '1px solid #e8e8e8', paddingTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>处理</div>
              <Radio.Group value={action} onChange={(e) => setAction(e.target.value)} style={{ marginBottom: 12 }}>
                <Radio value={ReportStatus.HANDLED}>已处理</Radio>
                <Radio value={ReportStatus.REJECTED}>已驳回</Radio>
              </Radio.Group>
              {action === ReportStatus.HANDLED && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ marginRight: 8 }}>扣除被举报人靠谱值</span>
                  <InputNumber
                    min={0}
                    max={10000}
                    precision={0}
                    value={deductScore}
                    onChange={(v) => setDeductScore(v ?? 0)}
                    style={{ width: 120 }}
                  />
                  <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>默认 20，0 表示不扣；展示值下次周算后生效</span>
                </div>
              )}
              <TextArea
                rows={4}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="请输入处理意见（必填）"
                maxLength={500}
                showCount
                style={{ marginBottom: 12 }}
              />
              <div>
                <Button type="primary" loading={submitting} onClick={handleSubmit}>提交处理</Button>
              </div>
            </div>
          ) : (
            <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>处理记录</div>
              <div style={{ fontSize: 13, color: '#666' }}>处理意见：{detail.handle_remark || '-'}</div>
              <div style={{ fontSize: 13, color: '#666' }}>处理人：{detail.handled_by || '-'}</div>
              <div style={{ fontSize: 13, color: '#666' }}>处理时间：{detail.handled_at ? formatDateTime(detail.handled_at) : '-'}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>{loading ? '加载中…' : '暂无详情'}</div>
      )}
    </ScrollableModal>
  );
};

// ======================== 举报管理 ========================

const ReportManagement = () => {
  const { error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<AdminReportDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');
  /** 详情请求序号 + 当前打开凭证（id@token）：晚到旧响应不覆盖新记录，旧回调不误关新弹窗 */
  const detailTokenRef = useRef(0);
  const activeKeyRef = useRef('');

  const fetchList = useCallback(async (params: any) => {
    return reportApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      target_match_code: params.target_match_code || undefined,
    });
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<AdminReportListItem>({
    fetchFn: fetchList,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  /** 打开详情：重新拉取最新举报数据（带请求序号防竞态） */
  const openDetail = async (record: AdminReportListItem) => {
    const token = ++detailTokenRef.current;
    activeKeyRef.current = `${record.id}@${token}`;
    setDetailVisible(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res: any = await reportApi.getDetail(record.id);
      const d: AdminReportDetailResponse = Array.isArray(res) ? res[0] : res;
      if (token === detailTokenRef.current && d && typeof d === 'object') setDetail({ ...record, ...d });
    } catch (err: any) {
      if (token === detailTokenRef.current) showError(err?.response?.data?.message || '获取举报详情失败');
    } finally {
      if (token === detailTokenRef.current) setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    detailTokenRef.current++;
    activeKeyRef.current = '';
    setDetailVisible(false);
    setDetail(null);
  };

  /** 失败后重拉当前打开的详情（同步服务端状态，如他人已处理） */
  const reloadDetail = useCallback(async () => {
    const key = activeKeyRef.current;
    if (!key) return;
    const id = key.split('@')[0];
    const token = ++detailTokenRef.current;
    activeKeyRef.current = `${id}@${token}`;
    setDetailLoading(true);
    try {
      const res: any = await reportApi.getDetail(id);
      const d: AdminReportDetailResponse = Array.isArray(res) ? res[0] : res;
      if (token === detailTokenRef.current && d && typeof d === 'object') setDetail(d);
    } catch { /* 重拉失败静默：保留现有详情与错误提示 */ } finally {
      if (token === detailTokenRef.current) setDetailLoading(false);
    }
  }, []);

  const columns: ColumnsType<AdminReportListItem> = [
    {
      title: '举报人', key: 'reporter', width: 150,
      render: (_: any, r: AdminReportListItem) => {
        const uid = r.reporter?.user_id || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            onClick={() => { if (uid) { setUserDetailUserId(uid); setUserDetailVisible(true); } }}>
            <Space size={4}>
              <UserAvatar src={r.reporter?.avatar} nick={r.reporter?.nickname} />
              <span style={{ fontSize: 14 }}>{r.reporter?.nickname || '-'}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '被举报人', key: 'target', width: 150,
      render: (_: any, r: AdminReportListItem) => {
        const uid = r.target?.user_id || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            onClick={() => { if (uid) { setUserDetailUserId(uid); setUserDetailVisible(true); } }}>
            <Space size={4}>
              <UserAvatar src={r.target?.avatar} nick={r.target?.nickname} />
              <span style={{ fontSize: 14 }}>{r.target?.nickname || '-'}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '举报内容', dataIndex: 'content', key: 'content',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text || '-'}</span>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: number) => (
        <Tag color={REPORT_STATUS_COLORS[v] || 'default'} title={REPORT_STATUS_LABELS[v]}>{REPORT_STATUS_LABELS[v] ?? v}</Tag>
      ),
    },
    dateTimeColumn<AdminReportListItem>('created_at', '提交时间'),
    {
      title: '操作', key: 'action', width: 100, fixed: 'right' as const,
      render: (_: any, r: AdminReportListItem) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>
      ),
    },
  ];

  return (
    <StandardPage
      title="举报管理"
      description="管理用户提交的举报信息，查看举报双方资料与凭证并完成处理。"
      showAddButton={false}
      table={
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SearchPanel filters={REPORT_FILTERS} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
            <Button icon={<ReloadOutlined />} style={{ marginLeft: 12, flexShrink: 0 }} onClick={refresh}>刷新</Button>
          </div>
          <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />

          <ReportDetailModal
            open={detailVisible}
            detail={detail}
            loading={detailLoading}
            onClose={closeDetail}
            onHandled={refresh}
            onReloadDetail={reloadDetail}
            activeKeyRef={activeKeyRef}
          />

          <UserDetailCardModal
            visible={userDetailVisible}
            userId={userDetailUserId}
            onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
          />
        </>
      }
    />
  );
};

export default ReportManagement;
