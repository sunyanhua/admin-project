import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, Button, Empty, Form, Image, Space, Table, Tabs, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import './WarmUpManageModal.css';
import type { ColumnsType } from 'antd/es/table';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, Activity, RegisterRecord } from '@/api/services/activity-v1';
import { submissionApi, Submission } from '@/api/services/submission';
import { userApi } from '@/api/services/user';
import {
  SubmissionAuditStatus, SubmissionAuditStatusLabels, SubmissionAuditStatusColors,
  RegisterAuditStatus, RegisterAuditStatusLabels, RegisterAuditStatusColors,
  ActivityType,
} from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { formatDateTime } from '@/utils/format';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn, statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import SubmissionAuditModal from '@/components/operation/SubmissionAuditModal';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import type { FormField } from './FormConfigEditor';
import { WarmUpFieldControl, WarmUpValueCell, toFormValues, fromFormValues } from './warmUpFieldControls';

export interface WarmUpManageModalProps {
  visible: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface WarmUpContent {
  config: FormField[];
  values: Record<string, any>;
  data: Record<string, any[]>;
  /** 页面ID（warm_up_config 顶层 page_id 键，作为投稿展示渠道筛选值） */
  pageId: string;
}

/** 数据记录随机唯一 id（与二级字段随机 id 同一生成方式） */
const generateRecordId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** 解析 warm_up_config：{"config":[定义], "values":{字段id:值}, "data":{数据字段id:[记录]}} */
const parseWarmUp = (raw?: string): { obj: Record<string, any>; content: WarmUpContent } => {
  try {
    const obj = JSON.parse(raw || '{}');
    // 数据记录缺失 id 时补随机唯一 id（随下次保存落库），保证所有记录都有唯一 id
    const data: Record<string, any[]> = {};
    if (obj.data && typeof obj.data === 'object') {
      Object.keys(obj.data).forEach((key) => {
        const arr = obj.data[key];
        data[key] = Array.isArray(arr)
          ? arr.map((r: any) => (r && typeof r === 'object' ? { id: r.id ?? generateRecordId(), ...r } : r))
          : [];
      });
    }
    return {
      obj,
      content: {
        config: Array.isArray(obj.config) ? obj.config : [],
        values: obj.values && typeof obj.values === 'object' ? obj.values : {},
        data,
        pageId: String(obj.page_id || '').trim(),
      },
    };
  } catch {
    return { obj: {}, content: { config: [], values: {}, data: {}, pageId: '' } };
  }
};

// ==================== 配置管理 TAB（非「数据」字段统一一个表单） ====================

interface ConfigFormPanelProps {
  /** 活动与字段集合签名：变化时重建表单（initialValues 重新回填），避免 setFieldsValue 时序竞态冲掉用户输入 */
  formKey: string;
  fields: FormField[];
  values: Record<string, any>;
  saving: boolean;
  onSave: (formValues: Record<string, any>) => void;
}

const ConfigFormPanel: React.FC<ConfigFormPanelProps> = ({ formKey, fields, values, saving, onSave }) => {
  if (fields.length === 0) {
    return <Empty description="尚未配置任何预热字段，请先在活动编辑的「预热配置」中添加字段" />;
  }

  return (
    <Form key={formKey} layout="vertical" onFinish={onSave} initialValues={toFormValues(fields, values)}>
      {fields.map((f) => (
        <Form.Item
          key={f.id}
          name={f.id}
          label={f.label || f.id}
          rules={f.required ? [{ required: true, message: `请填写${f.label || f.id}` }] : undefined}
        >
          <WarmUpFieldControl field={f} />
        </Form.Item>
      ))}
      <Button type="primary" htmlType="submit" loading={saving}>保存</Button>
    </Form>
  );
};

// ==================== 数据记录 TAB（每个「数据」字段一个） ====================

interface DataRecordPanelProps {
  field: FormField;
  records: any[];
  saving: boolean;
  onAdd: (values: Record<string, any>) => Promise<boolean>;
  onDelete: (idx: number) => Promise<boolean>;
}

const DataRecordPanel: React.FC<DataRecordPanelProps> = ({ field, records, saving, onAdd, onDelete }) => {
  const [addVisible, setAddVisible] = useState(false);
  const nestedFields = field.config ?? [];

  const columns: ColumnsType<any> = [
    ...nestedFields.map((nf) => ({
      title: nf.label || nf.id,
      dataIndex: nf.id,
      key: nf.id,
      render: (v: any) => <WarmUpValueCell field={nf} value={v} />,
    })),
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, _record: any, idx: number) => (
        <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={saving}
          onClick={() => confirmDelete({
            name: '该条记录',
            deleteFn: async () => {
              const ok = await onDelete(idx);
              if (!ok) throw new Error('删除失败');
            },
          })}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Button icon={<PlusOutlined />} onClick={() => setAddVisible(true)} style={{ marginBottom: 12 }}>
        添加记录
      </Button>
      <Table rowKey={(_, idx) => String(idx)} columns={columns} dataSource={records} size="small" pagination={false} />
      <AddRecordModal
        visible={addVisible}
        fields={nestedFields}
        onCancel={() => setAddVisible(false)}
        onSubmit={onAdd}
      />
    </div>
  );
};

// ==================== 添加记录弹窗（按二级字段配置生成表单） ====================

interface AddRecordModalProps {
  visible: boolean;
  fields: FormField[];
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<boolean>;
}

const AddRecordModal: React.FC<AddRecordModalProps> = ({ visible, fields, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) form.resetFields();
  }, [visible, form]);

  const handleFinish = async (vals: Record<string, any>) => {
    setSubmitting(true);
    try {
      const ok = await onSubmit(fromFormValues(fields, vals));
      if (ok) {
        form.resetFields();
        onCancel();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableModal
      title="添加记录"
      open={visible}
      onCancel={onCancel}
      width={640}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>添加</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} autoComplete="off">
        {fields.map((f) => (
          <Form.Item
            key={f.id}
            name={f.id}
            label={f.label || f.id}
            rules={f.required ? [{ required: true, message: `请填写${f.label || f.id}` }] : undefined}
          >
            <WarmUpFieldControl field={f} />
          </Form.Item>
        ))}
      </Form>
    </ScrollableModal>
  );
};

// ==================== 动态审核 TAB（按页面ID渠道拉取投稿并审核） ====================

const SUBMISSION_STATUS_OPTIONS = [
  { label: '待审核', value: SubmissionAuditStatus.PENDING },
  { label: '通过', value: SubmissionAuditStatus.APPROVED },
  { label: '拒绝', value: SubmissionAuditStatus.REJECTED },
];

const submissionFilters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: SUBMISSION_STATUS_OPTIONS },
  { name: 'keyword', placeholder: '搜索投稿内容', type: 'input' },
];

interface SubmissionAuditPanelProps {
  /** 活动预热页面ID（作为投稿展示渠道 display_channel 筛选值） */
  pageId: string;
}

const SubmissionAuditPanel: React.FC<SubmissionAuditPanelProps> = ({ pageId }) => {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [auditRecord, setAuditRecord] = useState<Submission | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState<string>('');

  const fetchSubmissions = useCallback(async (params: any) => {
    return submissionApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword,
      display_channel: pageId,
    });
  }, [pageId]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Submission>({
    fetchFn: fetchSubmissions,
    formatResponse,
  });

  const columns: ColumnsType<Submission> = [
    {
      title: '发帖人',
      key: 'user',
      width: 160,
      render: (_: any, r: Submission) => {
        const up = r.user_profile;
        const nickname = up?.nickname || r.nickname || r.user_id;
        const avatar = up?.avatar || r.avatar || '';
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
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (text: string) => {
        if (!text) return <span style={{ color: '#999' }}>-</span>;
        return (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {text.length > 120 ? `${text.slice(0, 120)}...` : text}
          </span>
        );
      },
    },
    {
      title: '附件', dataIndex: 'attachments', key: 'attachments', width: 100,
      render: (atts: Submission['attachments']) => {
        if (!atts || atts.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space size={4} wrap>
            {atts.slice(0, 3).map((att, idx) => (
              <Image key={idx} src={att.url} preview={{ src: att.url }}
                style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }} />
            ))}
          </Space>
        );
      },
    },
    {
      title: '状态', dataIndex: 'audit_status', key: 'audit_status', width: 80,
      render: (v: number) => (
        <Tag color={SubmissionAuditStatusColors[v] || 'default'} title={SubmissionAuditStatusLabels[v]}>
          {SubmissionAuditStatusLabels[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, r: Submission) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setAuditRecord(r); setAuditModalVisible(true); }}>审核</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <SearchPanel
          filters={submissionFilters}
          values={searchValues}
          onChange={(name, value) => setSearchValues((prev) => ({ ...prev, [name]: value }))}
          onSearch={(vals) => search(vals)}
          onReset={() => { setSearchValues({}); search({}); }}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh} style={{ marginLeft: 12, flexShrink: 0 }}>刷新</Button>
      </div>
      <StandardTable className="warm-up-submission-audit" columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />

      <SubmissionAuditModal
        visible={auditModalVisible}
        record={auditRecord}
        pointsTopicKey={pageId}
        pushMessage={false}
        onClose={() => { setAuditModalVisible(false); setAuditRecord(null); }}
        onSuccess={refresh}
      />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </div>
  );
};

// ==================== 积分记录 TAB（话题数据 score 增减日志） ====================

interface TopicScoreLog {
  id: string;
  user_id: string;
  delta: number;
  value_after: number;
  reason: string;
  operator_type: number; // 1=C端用户 2=管理后台
  created_at: string;
  /** 关联用户数据（同款三字段口径：user_data/user_profile/user_match_profile） */
  user_profile?: { nickname?: string; avatar?: string } | null;
}

const OPERATOR_TYPE_OPTIONS = [
  { label: 'C端用户', value: 1 },
  { label: '管理后台', value: 2 },
];

const scoreLogFilters: FilterConfig[] = [
  { name: 'operator_type', placeholder: '全部操作者', type: 'select', options: OPERATOR_TYPE_OPTIONS },
  { name: 'reason', placeholder: '搜索事由', type: 'input' },
];

interface ScoreLogsPanelProps {
  /** 活动预热页面ID（作为话题键 topic_key） */
  pageId: string;
}

const ScoreLogsPanel: React.FC<ScoreLogsPanelProps> = ({ pageId }) => {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState<string>('');

  const fetchLogs = useCallback(async (params: any) => {
    return userApi.getTopicScoreLogs(pageId, {
      page: params.page,
      size: params.page_size,
      operator_type: params.operator_type,
      reason: params.reason,
    });
  }, [pageId]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<TopicScoreLog>({
    fetchFn: fetchLogs,
    formatResponse,
  });

  const columns: ColumnsType<TopicScoreLog> = [
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: any, r: TopicScoreLog) => {
        const nickname = r.user_profile?.nickname || r.user_id;
        const avatar = r.user_profile?.avatar || '';
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
      title: '积分变化', dataIndex: 'delta', key: 'delta', width: 90,
      render: (v: number) => (
        <span style={{ color: (v ?? 0) > 0 ? '#52c41a' : (v ?? 0) < 0 ? '#ff4d4f' : '#999', fontWeight: 500 }}>
          {(v ?? 0) > 0 ? `+${v}` : v ?? 0}
        </span>
      ),
    },
    { title: '变动后', dataIndex: 'value_after', key: 'value_after', width: 80 },
    {
      title: '事由', dataIndex: 'reason', key: 'reason',
      render: (text: string) => text || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '操作者', dataIndex: 'operator_type', key: 'operator_type', width: 90,
      render: (v: number) => (
        <Tag color={v === 2 ? 'blue' : 'default'} title={v === 2 ? '管理后台' : 'C端用户'}>
          {v === 2 ? '管理后台' : 'C端用户'}
        </Tag>
      ),
    },
    dateTimeColumn<TopicScoreLog>('created_at', '时间'),
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <SearchPanel
          filters={scoreLogFilters}
          values={searchValues}
          onChange={(name, value) => setSearchValues((prev) => ({ ...prev, [name]: value }))}
          onSearch={(vals) => search(vals)}
          onReset={() => { setSearchValues({}); search({}); }}
        />
        <Button icon={<ReloadOutlined />} onClick={refresh} style={{ marginLeft: 12, flexShrink: 0 }}>刷新</Button>
      </div>
      <StandardTable className="warm-up-submission-audit" columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </div>
  );
};

// ==================== 积分排行 TAB（话题数据用户 + 报名状态，按 score_1 降序） ====================

interface ScoreRankRow {
  user_id: string;
  score: number;
  /** 话题数据行状态（0=正常 1=屏蔽） */
  status: number;
  /** 该用户在本活动的报名记录（未报名为 null；头像昵称/报名时间/状态均由此取） */
  register: RegisterRecord | null;
}

interface ScoreRankPanelProps {
  /** 活动预热页面ID（作为话题键 topic_key） */
  pageId: string;
  activityId: string;
  activityType: number;
}

const ScoreRankPanel: React.FC<ScoreRankPanelProps> = ({ pageId, activityId, activityType }) => {
  const { success, error: showError } = useAppNotification();
  const [data, setData] = useState<ScoreRankRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState<string>('');

  /** 状态切换：正常（0）/ 屏蔽（1） */
  const handleStatusToggle = async (record: ScoreRankRow, checked: boolean) => {
    const next = checked ? 0 : 1;
    try {
      await userApi.updateTopicDataStatus(record.user_id, pageId, next);
      success('状态更新成功');
      setData((prev) => prev.map((item) => (item.user_id === record.user_id ? { ...item, status: next } : item)));
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  /** 全量拉取话题数据 + 报名记录，客户端 join 后按 score_1 降序（接口无排序参数） */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const rows: any[] = [];
      let page = 1;
      while (true) {
        const res: any = await userApi.getTopicDataList(pageId, { page, size: 100 });
        const list = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        rows.push(...list);
        if (list.length < 100) break;
        page++;
      }
      // 报名记录全量（接口无 user_id 筛选 → 客户端按 user_id join）
      const regMap = new Map<string, RegisterRecord>();
      let rp = 1;
      while (true) {
        const res: any = await activityApi.getRegisters(activityId, { page: rp, size: 100 });
        const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        list.forEach((r) => regMap.set(r.user_id, r));
        if (list.length < 100) break;
        rp++;
      }
      const joined: ScoreRankRow[] = rows
        .map((r) => ({
          user_id: r.user_id,
          score: r.score_1 ?? 0,
          status: r.status ?? 0,
          register: regMap.get(r.user_id) ?? null,
        }))
        .sort((a, b) => b.score - a.score);
      setData(joined);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [pageId, activityId, showError]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const columns: ColumnsType<ScoreRankRow> = [
    {
      title: '用户',
      key: 'user',
      width: 160,
      render: (_: any, r: ScoreRankRow) => {
        const up = r.register?.user_profile;
        const nickname = up?.nickname || r.register?.nickname || r.user_id;
        const avatar = up?.avatar || r.register?.avatar || '';
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
      title: '报名时间', key: 'register_time', width: 120,
      render: (_: any, r: ScoreRankRow) => (
        r.register?.created_at ? formatDateTime(r.register.created_at) : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '报名状态', key: 'register_status', width: 90,
      render: (_: any, r: ScoreRankRow) => {
        if (!r.register) return <Tag color="default" title="未报名">未报名</Tag>;
        if (activityType === ActivityType.FREE_REVIEW) {
          const v = r.register.audit_status;
          return <Tag color={RegisterAuditStatusColors[v] || 'default'} title={RegisterAuditStatusLabels[v]}>{RegisterAuditStatusLabels[v] ?? v}</Tag>;
        }
        return <Tag color="success" title="已报名">已报名</Tag>;
      },
    },
    {
      title: '总积分', dataIndex: 'score', key: 'score', width: 90,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v ?? 0}</span>,
    },
    statusSwitchColumn<ScoreRankRow>('status', 0, 1, handleStatusToggle, '正常', '屏蔽', 100),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>刷新</Button>
      </div>
      <Table
        className="warm-up-submission-audit"
        columns={columns}
        dataSource={data}
        rowKey="user_id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
      />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </div>
  );
};

// ==================== 预热管理弹窗 ====================

const WarmUpManageModal: React.FC<WarmUpManageModalProps> = ({ visible, activity, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [content, setContent] = useState<WarmUpContent>({ config: [], values: {}, data: {}, pageId: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  /** 完整 JSON 对象（保留 config 定义与未知键，保存时只更新 values/data） */
  const fullObjRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!visible || !activity) return;
    const { obj, content: c } = parseWarmUp(activity.warm_up_config);
    fullObjRef.current = obj;
    setContent(c);
    setActiveTab('config');
  }, [visible, activity]);

  /** 保存 values/data 到 warm_up_config（PATCH 只更新该字段）。silent=true 时不弹错误（confirmDelete 统一提示） */
  const saveWarmUp = async (patch: { values?: Record<string, any>; data?: Record<string, any> }, silent = false): Promise<boolean> => {
    if (!activity) return false;
    setSaving(true);
    try {
      const merged = {
        ...fullObjRef.current,
        values: patch.values ?? fullObjRef.current.values ?? {},
        data: patch.data ?? fullObjRef.current.data ?? {},
      };
      const res: any = await activityApi.update(activity.id, { warm_up_config: JSON.stringify(merged) });
      const updated = res as Activity;
      const { obj, content: c } = parseWarmUp(updated?.warm_up_config);
      fullObjRef.current = obj;
      setContent(c);
      success('保存成功');
      onSuccess();
      return true;
    } catch (err: any) {
      if (!silent) showError(err?.response?.data?.message || '保存失败');
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** 配置管理保存：values 整体取表单结果（清空的字段不写入） */
  const handleConfigSave = async (formValues: Record<string, any>) => {
    const nonDataFields = content.config.filter((f) => f.type !== 'data');
    await saveWarmUp({ values: fromFormValues(nonDataFields, formValues) });
  };

  /** 数据记录添加：每条记录分配随机唯一 id 后追加到该字段的记录数组末尾 */
  const handleAddRecord = async (fieldId: string, values: Record<string, any>): Promise<boolean> => {
    const record = { ...values, id: generateRecordId() };
    const next = [...(content.data[fieldId] ?? []), record];
    return saveWarmUp({ data: { ...content.data, [fieldId]: next } });
  };

  /** 数据记录删除：按行号移除后整体替换该字段记录 */
  const handleDeleteRecord = async (fieldId: string, idx: number): Promise<boolean> => {
    const records = content.data[fieldId] ?? [];
    const next = records.filter((_, i) => i !== idx);
    return saveWarmUp({ data: { ...content.data, [fieldId]: next } }, true);
  };

  const nonDataFields = content.config.filter((f) => f.type !== 'data');
  const dataFields = content.config.filter((f) => f.type === 'data');
  /** 活动 + 字段集合签名：切换活动或字段集合变化时重建配置表单 */
  const configFormKey = `${activity?.id || 'none'}:${nonDataFields.map((f) => f.id).join('|')}`;

  const tabItems = [
    {
      key: 'config',
      label: '配置管理',
      children: (
        <ConfigFormPanel
          formKey={configFormKey}
          fields={nonDataFields}
          values={content.values}
          saving={saving}
          onSave={handleConfigSave}
        />
      ),
    },
    ...dataFields.map((f) => ({
      key: `data:${f.id}`,
      label: f.label || f.id,
      children: (
        <DataRecordPanel
          field={f}
          records={content.data[f.id] ?? []}
          saving={saving}
          onAdd={(vals) => handleAddRecord(f.id, vals)}
          onDelete={(idx) => handleDeleteRecord(f.id, idx)}
        />
      ),
    })),
    {
      key: 'audit',
      label: '动态审核',
      children: content.pageId ? (
        <SubmissionAuditPanel key={content.pageId} pageId={content.pageId} />
      ) : (
        <Empty description="尚未配置页面ID，请先在活动编辑的「预热」区块填写页面ID" />
      ),
    },
    {
      key: 'rank',
      label: '积分排行',
      children: content.pageId ? (
        <ScoreRankPanel
          key={`${content.pageId}-${activity?.id || 'none'}`}
          pageId={content.pageId}
          activityId={activity?.id || ''}
          activityType={activity?.activity_type ?? 0}
        />
      ) : (
        <Empty description="尚未配置页面ID，请先在活动编辑的「预热」区块填写页面ID" />
      ),
    },
    {
      key: 'score-logs',
      label: '积分记录',
      children: content.pageId ? (
        <ScoreLogsPanel key={content.pageId} pageId={content.pageId} />
      ) : (
        <Empty description="尚未配置页面ID，请先在活动编辑的「预热」区块填写页面ID" />
      ),
    },
  ];

  return (
    <ScrollableModal
      title={activity ? `预热管理 - ${activity.title}` : '预热管理'}
      open={visible}
      onCancel={onClose}
      width={860}
      footer={null}
    >
      {activity && <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />}
    </ScrollableModal>
  );
};

export default WarmUpManageModal;
