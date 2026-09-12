import { useState, useEffect, useRef } from 'react';
import { Button, Empty, Form, Space, Table, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, Activity } from '@/api/services/activity-v1';
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
}

/** 解析 warm_up_config：{"config":[定义], "values":{字段id:值}, "data":{数据字段id:[记录]}} */
const parseWarmUp = (raw?: string): { obj: Record<string, any>; content: WarmUpContent } => {
  try {
    const obj = JSON.parse(raw || '{}');
    return {
      obj,
      content: {
        config: Array.isArray(obj.config) ? obj.config : [],
        values: obj.values && typeof obj.values === 'object' ? obj.values : {},
        data: obj.data && typeof obj.data === 'object' ? obj.data : {},
      },
    };
  } catch {
    return { obj: {}, content: { config: [], values: {}, data: {} } };
  }
};

// ==================== 配置管理 TAB（非「数据」字段统一一个表单） ====================

interface ConfigFormPanelProps {
  fields: FormField[];
  values: Record<string, any>;
  saving: boolean;
  onSave: (formValues: Record<string, any>) => void;
}

const ConfigFormPanel: React.FC<ConfigFormPanelProps> = ({ fields, values, saving, onSave }) => {
  const [form] = Form.useForm();

  // 活动切换/保存后同步最新值（Tabs 页面常驻，仅靠 initialValues 不会更新）
  useEffect(() => {
    form.setFieldsValue(toFormValues(fields, values));
  }, [fields, values, form]);

  if (fields.length === 0) {
    return <Empty description="尚未配置任何预热字段，请先在活动编辑的「预热配置」中添加字段" />;
  }

  return (
    <Form form={form} layout="vertical" onFinish={onSave} initialValues={toFormValues(fields, values)}>
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

// ==================== 预热管理弹窗 ====================

const WarmUpManageModal: React.FC<WarmUpManageModalProps> = ({ visible, activity, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [content, setContent] = useState<WarmUpContent>({ config: [], values: {}, data: {} });
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

  /** 数据记录添加：追加到该字段的记录数组末尾 */
  const handleAddRecord = async (fieldId: string, values: Record<string, any>): Promise<boolean> => {
    const next = [...(content.data[fieldId] ?? []), values];
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

  const tabItems = [
    {
      key: 'config',
      label: '配置管理',
      children: (
        <ConfigFormPanel fields={nonDataFields} values={content.values} saving={saving} onSave={handleConfigSave} />
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
