import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Typography, Modal, Form, Input, Switch, Upload, InputNumber } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { categoryApi } from '../../api/services/category';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { uploadApi } from '@/api/services/upload';

const { Title } = Typography;

// 预设图标列表（本地 iconfont）
const PRESET_ICONS = [
  'yinshi', 'qiche1', 'xuexi', 'yinshi1', 'kafei', 'a-174_yanchanghui',
  'youxi', 'feiji', 'yule', 'qiche', 'pashan', 'dengshan', 'dianying',
  'luxiangji', 'youxi1', 'jianshen', 'yinle3', 'yinle4', 'a-178_dushubiji-11',
  'dingdan', 'a-faxian2', 'fuwu', 'jifen', 'huodong', 'kabao', 'jiazai',
  'qianbao', 'shangcheng', 'renwu', 'jutiweizhi', 'xiangji', 'yaoqinghaoyou',
  'shequ', 'yinhangka', 'shijian', 'tianqi_xue', 'zhengce', 'tongzhixiang',
  'xinxi', 'jine', 'tianqi_qing', 'shequpingjia', 'diqiu', 'yonghushouce',
];

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

interface Category {
  id: number;
  key: string;
  title: string;
  cover?: string;
  status?: number;
  orderon?: number;
  tags?: number;
}

const EventCategories = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { success, error } = useAppNotification();

  const fetchCategories = useCallback(async (params: any) => {
    return categoryApi.getCategories({ ...params, tags: 1 });
  }, []);

  const formatCategoryResponse = useCallback((res: any) => ({
    list: res?.data || res?.data?.data || [],
    count: res?.count || res?.data?.count || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Category>({
    fetchFn: fetchCategories,
    formatResponse: formatCategoryResponse,
  });

  const handleAdd = () => {
    setEditingCategory(null);
    setModalVisible(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleEdit = (record: Category) => {
    setEditingCategory(record);
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        title: record.title,
        cover: record.cover,
        status: record.status ?? 0,
        tags: 1,
      });
    }, 0);
  };

  const handleDelete = (record: Category) => {
    confirmDelete({
      name: record.title,
      deleteFn: () => categoryApi.deleteCategory(record.id),
      onSuccess: refresh,
    });
  };

  // 状态切换
  const handleStatusToggle = async (record: Category, checked: boolean) => {
    try {
      await categoryApi.updateStatus(record.id, checked ? 0 : 1);
      success(checked ? '已启用' : '已禁用');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '状态更新失败');
    }
  };

  // 排序修改
  const handleOrderChange = async (record: Category, value: number | null | string) => {
    try {
      const orderon = value === '' || value === null || value === undefined ? null : Number(value);
      await categoryApi.updateOrder(record.id, orderon as number);
      success('排序更新成功');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '排序更新失败');
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!file.type.includes('png')) {
      error('只能上传 PNG 格式图片');
      return false;
    }
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file) as any;
      let url = '';
      if (typeof res === 'string') url = res;
      else if (res?.url) url = res.url;
      else if (res?.data?.url) url = res.data.url;
      form.setFieldsValue({ cover: url });
      success('图标上传成功');
    } catch (err: any) {
      error(err.response?.data?.msg || '上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload: Record<string, any> = {
        title: values.title,
        cover: values.cover,
        status: values.status ?? 0,
        tags: 1,
      };
      if (values.orderon !== undefined && values.orderon !== '' && values.orderon !== null) {
        payload.orderon = values.orderon;
      }
      if (editingCategory) {
        await categoryApi.updateCategory(editingCategory.id, payload);
        success('更新成功');
      } else {
        await categoryApi.createCategory(payload);
        success('创建成功');
      }
      setModalVisible(false);
      refresh();
    } catch (err: any) {
      if (err.errorFields) return;
      error(err.response?.data?.msg || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Category> = [
    {
      title: '图标',
      key: 'cover',
      width: 70,
      render: (_: any, record: any) => {
        if (!record.cover) return '-';
        // 先尝试用 uni 名称映射查找 Ant Design 图标名称，再渲染图标
        // 如果是预设图标名称，渲染本地 iconfont
        if (record.cover && PRESET_ICONS.includes(record.cover)) {
          return <span className={`iconfont icon-${record.cover}`} style={{ fontSize: 20 }} />;
        }
        // 否则渲染为图片
        return <img src={record.cover} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />;
      },
    },
    {
      title: '名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'orderon',
      key: 'orderon',
      width: 100,
      render: (orderon: number | undefined, record: Category) => (
        <InputNumber
          min={0}
          value={orderon}
          style={{ width: 70 }}
          onChange={(value) => {
            if (value === null) {
              handleOrderChange(record, null);
            }
          }}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? null : parseInt(val);
            if (num !== (record.orderon ?? null)) {
              handleOrderChange(record, num);
            }
          }}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number | undefined, record: Category) => (
        <Switch
          checked={status === 0}
          onChange={(checked) => handleStatusToggle(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    ActionColumn({
      onEdit: handleEdit,
      onDelete: handleDelete,
      showView: false,
    }),
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  return (
    <>
      <StandardPage
        title="活动类型管理"
        description="管理平台活动类型分类。"
        showRefreshButton={true}
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加类型"
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
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
            scroll={{ x: 1000 }}
          />
        }
      />

      <Modal
        title={editingCategory ? '编辑类型' : '添加类型'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ status: 0, tags: 1 }}>
          <Form.Item
            label="名称"
            name="title"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input placeholder="请输入类型名称" />
          </Form.Item>

          <Form.Item label="图标" required>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16 }}>
              <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
                预设图标（点击选择）：
              </div>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.cover !== curr.cover}>
                {({ getFieldValue }) => {
                  const selectedCover = getFieldValue('cover');
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
                      {PRESET_ICONS.map((icon) => (
                        <div
                          key={icon}
                          onClick={() => form.setFieldsValue({ cover: icon })}
                          style={{
                            padding: '8px 4px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            border: selectedCover === icon ? '2px solid #1890ff' : '1px solid #d9d9d9',
                            borderRadius: 4,
                            backgroundColor: selectedCover === icon ? '#e6f7ff' : 'transparent',
                          }}
                        >
                          <span className={`iconfont icon-${icon}`} style={{ fontSize: 22 }} />
                        </div>
                      ))}
                    </div>
                  );
                }}
              </Form.Item>

              <div style={{ marginTop: 16, marginBottom: 8, color: '#666', fontSize: 13 }}>
                或自定义上传（建议尺寸 100×100，PNG格式，推荐前往<a href="https://www.iconfont.cn/" target="_blank" rel="noopener noreferrer">https://www.iconfont.cn/</a>制作）
              </div>
              <Space align="center">
                <Upload
                  accept="image/png"
                  showUploadList={false}
                  beforeUpload={handleCoverUpload}
                  disabled={uploading}
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {uploading ? '上传中...' : '上传图标'}
                  </Button>
                </Upload>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.cover !== curr.cover}>
                  {({ getFieldValue }) => {
                    const cover = getFieldValue('cover');
                    if (cover && !PRESET_ICONS.includes(cover)) {
                      return <img src={cover} alt="预览" style={{ width: 48, height: 48, objectFit: 'contain', border: '1px solid #d9d9d9', borderRadius: 4 }} />;
                    }
                    return null;
                  }}
                </Form.Item>
              </Space>

              <Form.Item name="cover" style={{ display: 'none' }}>
                <Input />
              </Form.Item>
            </div>
          </Form.Item>

          {!editingCategory && (
            <Form.Item
              label="排序"
              name="orderon"
            >
              <Input type="number" placeholder="数值越小越靠前" />
            </Form.Item>
          )}

          <Form.Item
            label="状态"
            name="status"
            valuePropName="checked"
            getValueFromEvent={(checked) => checked ? 0 : 1}
            getValueProps={(value) => ({ checked: value === 0 })}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item name="tags" style={{ display: 'none' }}>
            <Input type="hidden" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default EventCategories;
