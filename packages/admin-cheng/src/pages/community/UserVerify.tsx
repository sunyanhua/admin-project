import { useState, useCallback } from 'react';
import { Button, Tag, Tabs, Space, Form, Input } from 'antd';
import { PlusOutlined, SafetyCertificateOutlined, OrderedListOutlined, UndoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import IdVerifyPriceRuleModal from '@/components/system/IdVerifyPriceRuleModal';
import ScrollableModal from '@/components/templates/ScrollableModal';
import UserAvatar from '@/components/user/UserAvatar';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import { idverifyApi, PriceRule, PriceRuleStatus, IdVerifyRecord, IdVerifyRecordStatus } from '@/api/services/idverify';
import { formatDateTime, formatCents } from '@/utils/format';

const STATUS_OPTIONS = [
  { label: '启用', value: PriceRuleStatus.ENABLED },
  { label: '停用', value: PriceRuleStatus.DISABLED },
];

const RECORD_STATUS_OPTIONS = [
  { label: '待支付', value: IdVerifyRecordStatus.PENDING_PAYMENT },
  { label: '待认证', value: IdVerifyRecordStatus.PENDING_VERIFY },
  { label: '已通过', value: IdVerifyRecordStatus.PASSED },
  { label: '重试耗尽', value: IdVerifyRecordStatus.EXHAUSTED },
  { label: '已关闭', value: IdVerifyRecordStatus.CLOSED },
  { label: '已退款', value: IdVerifyRecordStatus.REFUNDED },
  { label: '已撤销', value: IdVerifyRecordStatus.REVOKED },
];

const RECORD_STATUS_META: Record<number, { label: string; color: string }> = {
  [IdVerifyRecordStatus.PENDING_PAYMENT]: { label: '待支付', color: 'orange' },
  [IdVerifyRecordStatus.PENDING_VERIFY]: { label: '待认证', color: 'blue' },
  [IdVerifyRecordStatus.PASSED]: { label: '已通过', color: 'green' },
  [IdVerifyRecordStatus.EXHAUSTED]: { label: '重试耗尽', color: 'red' },
  [IdVerifyRecordStatus.CLOSED]: { label: '已关闭', color: 'default' },
  [IdVerifyRecordStatus.REFUNDED]: { label: '已退款', color: 'purple' },
  [IdVerifyRecordStatus.REVOKED]: { label: '已撤销', color: 'volcano' },
};

/** 响应结构统一解析（拦截器可能返回 { list, total } 或原始数组） */
const formatResponse = (res: any) => {
  const list = Array.isArray(res) ? res : (res?.list || []);
  const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
  return { list, count: total };
};

/** 认证记录 TAB（默认）：只读列表（按创建时间倒序；不含真实姓名/身份证号） */
const RecordsTab: React.FC = () => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');
  const [revokeVisible, setRevokeVisible] = useState(false);
  const [revokingRecord, setRevokingRecord] = useState<IdVerifyRecord | null>(null);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [revokeForm] = Form.useForm<{ reason: string }>();

  const fetchRecords = useCallback(async (params: any) => {
    return idverifyApi.getRecords({
      page: params.page,
      size: params.page_size,
      status: params.status,
      user_id: params.user_id || undefined,
    });
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<IdVerifyRecord>({
    fetchFn: fetchRecords,
    formatResponse,
  });

  /** 打开撤销弹窗（填写撤销理由，必填 ≤500 字，写入审计日志） */
  const handleRevoke = (record: IdVerifyRecord) => {
    setRevokingRecord(record);
    setRevokeVisible(true);
  };

  /** 提交撤销：撤销已通过的实人认证（不退款，解除实名标记并允许重新认证） */
  const handleRevokeSubmit = async () => {
    if (!revokingRecord) return;
    try {
      const values = await revokeForm.validateFields();
      setRevokeSubmitting(true);
      await idverifyApi.revokeRecord(revokingRecord.id, { reason: values.reason.trim() });
      success('已撤销认证');
      setRevokeVisible(false);
      setRevokingRecord(null);
      revokeForm.resetFields();
      refresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '撤销失败');
    } finally {
      setRevokeSubmitting(false);
    }
  };

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: RECORD_STATUS_OPTIONS },
    { name: 'user_id', placeholder: '用户ID', type: 'input' },
  ];

  const columns: ColumnsType<IdVerifyRecord> = [
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: any, r: IdVerifyRecord) => {
        const nickname = r.user_profile?.nickname || r.user_id || '-';
        const avatar = r.user_profile?.avatar || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            disabled={!r.user_id}
            onClick={() => { if (!r.user_id) return; setUserDetailUserId(r.user_id); setUserDetailVisible(true); }}>
            <Space size={4}>
              <UserAvatar src={avatar} nick={nickname} />
              <span style={{ fontSize: 14 }}>{nickname}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: number) => {
        const meta = RECORD_STATUS_META[v];
        return <Tag color={meta?.color || 'default'} title={meta?.label ?? v}>{meta?.label ?? v}</Tag>;
      },
    },
    {
      title: '价格（元）',
      dataIndex: 'price_coins',
      key: 'price_coins',
      width: 100,
      render: (v: number) => (v === 0 ? <Tag color="green" title="免费">免费</Tag> : formatCents(v)),
    },
    {
      title: '原价（元）',
      dataIndex: 'original_price_coins',
      key: 'original_price_coins',
      width: 100,
      render: (v: number) => (v > 0 ? formatCents(v) : '-'),
    },
    {
      title: '尝试次数',
      dataIndex: 'attempt_count',
      key: 'attempt_count',
      width: 90,
      render: (v: number) => v ?? '-',
    },
    {
      title: '失败次数',
      dataIndex: 'failed_count',
      key: 'failed_count',
      width: 90,
      render: (v: number) => v ?? '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (v: string) => {
        const t = formatDateTime(v);
        return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
      },
    },
    {
      title: '通过时间',
      dataIndex: 'verified_at',
      key: 'verified_at',
      width: 120,
      render: (v: string) => {
        if (!v) return null;
        const t = formatDateTime(v);
        return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
      },
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 120,
      render: (v: string) => {
        if (!v) return null;
        const t = formatDateTime(v);
        return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: any, r: IdVerifyRecord) => (
        <Space size={4} className="action-buttons">
          {r.status === IdVerifyRecordStatus.PASSED && (
            <Button type="link" size="small" danger icon={<UndoOutlined />} onClick={() => handleRevoke(r)}>撤销</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />

      <ScrollableModal
        title="确认撤销认证"
        open={revokeVisible}
        onCancel={() => { setRevokeVisible(false); setRevokingRecord(null); revokeForm.resetFields(); }}
        width={480}
        destroyOnHidden
        footer={
          <Button type="primary" danger loading={revokeSubmitting} onClick={() => revokeForm.submit()}>
            确认撤销
          </Button>
        }
      >
        <Form form={revokeForm} layout="vertical" onFinish={handleRevokeSubmit}>
          <Form.Item
            label={`撤销理由（用户「${revokingRecord?.user_profile?.nickname || revokingRecord?.user_id || ''}」）`}
            name="reason"
            rules={[{ required: true, message: '请输入撤销理由' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="撤销后用户实名状态解除并可重新认证；不进行退款，且已撤销记录不可再申请退款"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </ScrollableModal>
    </div>
  );
};

/** 价格规则 TAB：列表/新增/编辑/状态切换（后端无删除接口；启用规则时间区间不可重叠） */
const PriceRulesTab: React.FC = () => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);

  const fetchRules = useCallback(async (params: any) => {
    return idverifyApi.getPriceRules({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword || undefined,
    });
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<PriceRule>({
    fetchFn: fetchRules,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleStatusToggle = async (record: PriceRule, checked: boolean) => {
    try {
      await idverifyApi.updatePriceRule(record.id, { status: checked ? PriceRuleStatus.ENABLED : PriceRuleStatus.DISABLED });
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  const handleAdd = () => { setModalMode('create'); setEditingRule(null); setModalVisible(true); };
  const handleEdit = (record: PriceRule) => { setModalMode('edit'); setEditingRule(record); setModalVisible(true); };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
    { name: 'keyword', placeholder: '搜索规则名称/备注', type: 'input' },
  ];

  const columns: ColumnsType<PriceRule> = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text}</span>,
    },
    {
      title: '价格（元）',
      dataIndex: 'price_coins',
      key: 'price_coins',
      width: 100,
      render: (v: number) => (v === 0 ? <Tag color="green" title="免费">免费</Tag> : formatCents(v)),
    },
    {
      title: '原价（元）',
      dataIndex: 'original_price_coins',
      key: 'original_price_coins',
      width: 100,
      render: (v: number) => (v > 0 ? formatCents(v) : '-'),
    },
    {
      title: '生效开始',
      dataIndex: 'start_at',
      key: 'start_at',
      width: 120,
      render: (v: string) => {
        const t = formatDateTime(v);
        return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
      },
    },
    {
      title: '生效结束',
      dataIndex: 'end_at',
      key: 'end_at',
      width: 120,
      render: (v: string) => {
        const t = formatDateTime(v);
        return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 160,
      ellipsis: true,
      render: (v: string) => <span title={v || ''}>{v || '-'}</span>,
    },
    statusSwitchColumn<PriceRule>('status', PriceRuleStatus.ENABLED, PriceRuleStatus.DISABLED, handleStatusToggle, '启用', '停用', 100),
    ActionColumn({ onEdit: handleEdit, showDelete: false, width: 100 }),
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增规则</Button>
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />

      <IdVerifyPriceRuleModal
        visible={modalVisible}
        mode={modalMode}
        rule={editingRule}
        onClose={() => { setModalVisible(false); setEditingRule(null); }}
        onSuccess={refresh}
      />
    </div>
  );
};

const UserVerify = () => {
  const [tabKey, setTabKey] = useState('records');

  return (
    <StandardPage
      title="用户认证"
      description="查看用户实名认证的办理情况并配置价格规则，点击用户头像或昵称可查看该用户的完整资料。"
      table={
        <Tabs
          activeKey={tabKey}
          onChange={setTabKey}
          items={[
            { key: 'records', label: '认证记录', icon: <OrderedListOutlined />, children: <RecordsTab /> },
            { key: 'rules', label: '价格规则', icon: <SafetyCertificateOutlined />, children: tabKey === 'rules' ? <PriceRulesTab /> : null },
          ]}
        />
      }
    />
  );
};

export default UserVerify;
