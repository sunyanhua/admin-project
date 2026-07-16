import { useState, useCallback, useMemo } from 'react';
import { Button, Input, InputNumber, Select, Switch, Tag, Space, Form, Grid, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useAuth } from '@/contexts/AuthContext';
import { refundRuleApi } from '@/api/services/refundRule';
import type { RefundRule, RefundRuleStage } from '@/api/services/refundRule';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel } from '@/components/templates/SearchPanel';
import type { FilterConfig } from '@/components/templates/SearchPanel';
import ScrollableModal from '@/components/templates/ScrollableModal';

const filters: FilterConfig[] = [
  { name: 'is_hidden', placeholder: '全部状态', type: 'select', options: [
    { label: '显示', value: 'false' },
    { label: '隐藏', value: 'true' },
  ]},
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const { useBreakpoint } = Grid;

const REFUND_TYPE_OPTIONS = [
  { label: '按比例退', value: 'rate' },
  { label: '固定金额退', value: 'fixed' },
];

const renderStagesSummary = (stages?: RefundRuleStage[]) => {
  if (!stages || stages.length === 0) {
    return <span style={{ color: '#999' }}>未配置</span>;
  }
  const sorted = [...stages].sort((a, b) => b.days_before - a.days_before);
  return (
    <span style={{ wordBreak: 'break-word' }}>
      {sorted.map((s, i) => (
        <span key={i}>
          {i > 0 && ' | '}
          提前{s.days_before}天退
          {s.refund_type === 'rate' ? `${s.refund_value}%` : `¥${s.refund_value}`}
        </span>
      ))}
    </span>
  );
};

const RefundRuleManagement = () => {
  const { success, error: showError } = useAppNotification();
  const { user } = useAuth();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<RefundRule | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const hasSuper = useMemo(() => (user?.roles || []).includes('super_admin'), [user]);

  const fetchRules = useCallback(async (params: any) => {
    // 非超级管理员不加载系统级规则
    const finalParams = { ...params, ...(hasSuper ? {} : { is_system: false }) };
    // 筛选值转 boolean
    if (finalParams.is_hidden === 'true') finalParams.is_hidden = true;
    else if (finalParams.is_hidden === 'false') finalParams.is_hidden = false;
    else delete finalParams.is_hidden;
    return refundRuleApi.getRules(finalParams);
  }, [hasSuper]);

  const formatResponse = useCallback((res: any) => ({
    list: (res?.list || res?.data || []).map((item: any) => ({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      is_system: item.is_system ?? false,
      is_hidden: item.is_hidden ?? false,
      stages: item.stages || [],
      created_at: item.created_at,
      updated_at: item.updated_at,
    })),
    count: res?.total || res?.data?.total || 0,
  }), []);

  const {
    data,
    loading,
    pagination,
    onPageChange,
    refresh,
    search,
  } = useListPage<RefundRule>({
    fetchFn: fetchRules,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setSearchValues({});
    search({});
  };

  const columns: ColumnsType<RefundRule> = useMemo(() => {
    const cols: ColumnsType<RefundRule> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text}</span>,
    },
    {
      title: '阶梯说明',
      dataIndex: 'stages',
      key: 'stages',
      render: (stages: RefundRuleStage[]) => renderStagesSummary(stages),
    },
    ...(hasSuper ? [{
      title: '系统级',
      dataIndex: 'is_system' as const,
      key: 'is_system',
      width: 90,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'default'} title={val ? '系统' : '自定义'}>
          {val ? '系统' : '自定义'}
        </Tag>
      ),
    }] : []),
    {
      title: '显示/隐藏',
      dataIndex: 'is_hidden',
      key: 'is_hidden',
      width: 100,
      render: (val: boolean, record: RefundRule) => (
        <Switch
          checked={!val}
          checkedChildren="显示"
          unCheckedChildren="隐藏"
          onChange={async (checked) => {
            try {
              await refundRuleApi.updateRuleHidden(record.id, !checked);
              success(checked ? '已设为显示' : '已设为隐藏');
              refresh();
            } catch (err: any) {
              showError(err?.response?.data?.message || '操作失败');
            }
          }}
        />
      ),
    },
    ActionColumn({
      onEdit: (record: RefundRule) => {
        setEditingRule(record);
        setModalVisible(true);
        setTimeout(() => {
          form.setFieldsValue({
            name: record.name,
            description: record.description || '',
            stages: record.stages && record.stages.length > 0 ? record.stages : [{ days_before: 0, refund_type: 'rate' as const, refund_value: 0 }],
            is_system: record.is_system ?? false,
          });
        }, 0);
      },
      onDelete: (record: RefundRule) => confirmDelete({
        name: record.name,
        deleteFn: () => refundRuleApi.deleteRule(record.id),
        onSuccess: refresh,
      }),
      showView: false,
    }),
    ];
    return cols;
  }, [hasSuper]);

  const handleAdd = () => {
    setEditingRule(null);
    setModalVisible(true);
    setTimeout(() => {
      form.resetFields();
      if (hasSuper) form.setFieldsValue({ is_system: false });
    }, 0);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const submitData: {
        name: string;
        description?: string;
        is_system?: boolean;
        stages?: RefundRuleStage[];
      } = {
        name: values.name,
        description: values.description || undefined,
        stages: (values.stages || []).filter((s: RefundRuleStage) => s.days_before >= 0),
      };
      // 仅超级管理员可设置系统级
      if (hasSuper) {
        submitData.is_system = values.is_system ?? false;
      }

      if (editingRule) {
        await refundRuleApi.updateRule(editingRule.id, submitData);
        success('更新成功');
      } else {
        await refundRuleApi.createRule(submitData);
        success('添加成功');
      }
      setModalVisible(false);
      refresh();
    } catch (err: any) {
      if (err.errorFields) return;
      showError(err.response?.data?.msg || err.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  return (
    <>
      <StandardPage
        title="退款规则管理"
        description="管理平台的退款规则，配置阶梯退的各阶段比例或金额。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加退款规则"
        searchArea={
          <SearchPanel
            filters={filters}
            values={searchValues}
            onChange={handleSearchChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        }
      />

      <ScrollableModal
        title={editingRule ? '编辑退款规则' : '添加退款规则'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleModalSubmit}>
              {editingRule ? '保存' : '创建'}
            </Button>
          </Space>
        }
        width={isMobile ? '90%' : 640}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            stages: [{ days_before: 0, refund_type: 'rate', refund_value: 0 }],
          }}
        >
          {editingRule && (
            <Alert
              type="warning" showIcon
              message="修改后，所有使用本规则的活动/票务/商品的退款规则都会同步更新，请谨慎操作！"
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="请输入退款规则名称" maxLength={100} showCount />
          </Form.Item>

          <Form.Item name="description" label="规则说明">
            <Input.TextArea placeholder="请输入规则说明（选填）" rows={3} maxLength={500} showCount />
          </Form.Item>

          <Form.Item label="退款阶梯" style={{ marginBottom: 0 }}>
            <Form.List name="stages">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, idx) => (
                    <Space key={key} align="baseline" wrap style={{
                      display: 'flex', marginBottom: 8, width: '100%',
                      borderBottom: idx < fields.length - 1 ? '1px solid #f0f0f0' : 'none',
                      paddingBottom: 8,
                    }}>
                      <Form.Item
                        {...restField}
                        name={[name, 'days_before']}
                        label="提前天数"
                        rules={[{ required: true, message: '请输入' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} placeholder="天数" style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'refund_type']}
                        label="退款方式"
                        rules={[{ required: true, message: '请选择' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select options={REFUND_TYPE_OPTIONS} style={{ width: 130 }} />
                      </Form.Item>
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) => prev?.stages?.[name]?.refund_type !== cur?.stages?.[name]?.refund_type}
                      >
                        {({ getFieldValue }) => {
                          const refundType = getFieldValue(['stages', name, 'refund_type']);
                          return (
                            <Form.Item
                              {...restField}
                              name={[name, 'refund_value']}
                              label="退款值"
                              rules={[{ required: true, message: '请输入' }]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber
                                min={0} max={999999}
                                style={{ width: 110 }}
                                formatter={refundType === 'rate' ? (v) => `${v}%` : undefined}
                                parser={refundType === 'rate' ? (v) => v?.replace('%', '') as any : undefined}
                              />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                      <Button
                        type="link" danger icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        style={{ alignSelf: 'flex-end', marginBottom: 0 }}
                      >
                        删除
                      </Button>
                    </Space>
                  ))}
                  <Button
                    type="dashed" onClick={() => add({ days_before: 0, refund_type: 'rate', refund_value: 0 })}
                    block icon={<PlusOutlined />}
                    style={{ marginTop: fields.length > 0 ? 0 : 8 }}
                  >
                    添加阶梯
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          {hasSuper && (
            <Form.Item name="is_system" label="系统级规则" valuePropName="checked" style={{ marginTop: 16 }}>
              <Switch checkedChildren="系统" unCheckedChildren="自定义" />
            </Form.Item>
          )}

        </Form>
      </ScrollableModal>
    </>
  );
};

export default RefundRuleManagement;
