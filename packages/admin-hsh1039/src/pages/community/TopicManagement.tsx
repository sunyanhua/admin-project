import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Typography, Modal, Form, Input, Switch, InputNumber, Upload, Image, Tag, Select } from 'antd';
import { PlusOutlined, UploadOutlined, ScissorOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ImgCrop from 'antd-img-crop';
import { momentApi } from '@/api/services/moment';
import { uploadApi } from '@/api/services/upload';
import { eventApi } from '@/api/services/event';
import { TopicStatus } from '@shared/constants/topic.enums';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import request from '@/api';

const { Title } = Typography;

const STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '启用', value: TopicStatus.ENABLED },
  { label: '禁用', value: TopicStatus.DISABLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

interface Topic {
  id: number;
  title: string;
  cover: string;
  brief: string;
  intro: string;
  status: TopicStatus;
  orderon: number;
  insertat: string;
}

interface RelatedEvent {
  id: number;
  eventid: number;
  topicid: number;
  title?: string;
  event_data?: {
    title?: string;
  };
}

interface SelectableEvent {
  id: number;
  title: string;
}

const TopicManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [selectableEvents, setSelectableEvents] = useState<SelectableEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const { success, error } = useAppNotification();

  const fetchTopics = useCallback(async (params: any) => {
    return momentApi.getTopics(params);
  }, []);

  const formatTopicResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.count || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Topic>({
    fetchFn: fetchTopics,
    formatResponse: formatTopicResponse,
  });

  const handleAdd = () => {
    setEditingTopic(null);
    setCoverUrl('');
    setRelatedEvents([]);
    setSelectableEvents([]);
    setSelectedEventId(null);
    setEditModalVisible(true);
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({ status: TopicStatus.ENABLED });
    }, 0);
  };

  const handleEdit = (record: Topic) => {
    setEditingTopic(record);
    setCoverUrl(record.cover || '');
    setSelectedEventId(null);
    setEditModalVisible(true);
    // 加载关联活动（内部会调用loadSelectableEvents过滤已关联活动）
    loadRelatedEvents(record.id);
    setTimeout(() => {
      form.setFieldsValue({
        title: record.title,
        cover: record.cover,
        brief: record.brief,
        intro: record.intro,
        status: record.status,
        orderon: record.orderon,
      });
    }, 0);
  };

  // 加载关联活动
  const loadRelatedEvents = async (topicId: number) => {
    setEventsLoading(true);
    try {
      const res = await request.get('/admin/v6/topic/event', { params: { topicid: topicId, length: 500 } }) as any;
      const list = res?.data?.list || res?.data || [];
      const relatedIds = list.map((e: any) => e.eventid);
      setRelatedEvents(list);
      loadSelectableEvents(relatedIds);
    } catch {
      setRelatedEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  // 加载可添加的活动列表（进行中状态）
  const loadSelectableEvents = async (relatedIds?: number[]) => {
    try {
      const res = await eventApi.getEvents({ start: 0, length: 500, status: 1 }) as any;
      const list = res?.data?.list || res?.data || [];
      // 优先使用传入的relatedIds，否则使用状态中的
      const excludeIds = relatedIds || relatedEvents.map(e => e.eventid);
      const filtered = list.filter((item: any) => !excludeIds.includes(item.id));
      setSelectableEvents(filtered.map((item: any) => ({
        id: item.id,
        title: item.title,
      })));
    } catch {
      setSelectableEvents([]);
    }
  };

  // 添加活动关联
  const handleAddEventRelation = async () => {
    if (!selectedEventId || !editingTopic) {
      error('请选择活动');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('topicid', String(editingTopic.id));
      formData.append('eventid', String(selectedEventId));
      await request.post('/admin/v6/topic/event', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      success('添加成功');
      setSelectedEventId(null);
      // loadRelatedEvents 内部会调用 loadSelectableEvents 过滤已关联活动
      loadRelatedEvents(editingTopic.id);
    } catch (err: any) {
      error(err.response?.data?.msg || '添加失败');
    }
  };

  // 删除活动关联
  const handleRemoveEventRelation = async (id: number) => {
    try {
      const formData = new FormData();
      formData.append('id', String(id));
      await request.post('/admin/v6/topic/event/delete', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      success('删除成功');
      if (editingTopic) {
        // loadRelatedEvents 内部会调用 loadSelectableEvents 过滤已关联活动
        loadRelatedEvents(editingTopic.id);
      }
    } catch (err: any) {
      error(err.response?.data?.msg || '删除失败');
    }
  };

  // 拖动排序
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newItems = [...relatedEvents];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    setRelatedEvents(newItems);
    setDragIndex(null);
    setDragOverIndex(null);
    // 拖动结束后保存排序
    saveRelatedEventsOrder(newItems);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // 保存关联活动排序
  const saveRelatedEventsOrder = async (events: RelatedEvent[]) => {
    try {
      for (let i = 0; i < events.length; i++) {
        const formData = new FormData();
        formData.append('id', String(events[i].id));
        formData.append('orderon', String(i + 1));
        await request.post('/admin/v6/topic/event/orderon', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      success('排序已保存');
    } catch (err: any) {
      error(err.response?.data?.msg || '保存排序失败');
    }
  };

  const handleDelete = (record: Topic) => {
    confirmDelete({
      name: record.title,
      deleteFn: () => momentApi.deleteTopic(record.id),
      onSuccess: refresh,
    });
  };

  // 处理状态切换
  const handleStatusToggle = async (record: Topic, checked: boolean) => {
    try {
      await momentApi.setTopicStatus(record.id, checked ? TopicStatus.ENABLED : TopicStatus.DISABLED);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '状态更新失败');
    }
  };

  // 处理排序修改
  const handleOrderChange = async (record: Topic, value: number | null) => {
    try {
      await momentApi.setTopicOrder(record.id, value ?? undefined);
      success('排序更新成功');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '排序更新失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const submitData = {
        ...values,
        cover: coverUrl,
      };
      if (editingTopic) {
        await momentApi.updateTopic(editingTopic.id, submitData);
        success('更新成功');
      } else {
        await momentApi.createTopic(submitData);
        success('创建成功');
      }
      setEditModalVisible(false);
      refresh();
    } catch (err: any) {
      if (err.errorFields) return;
      error(err.response?.data?.msg || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 处理图片上传
  const handleUpload = async (file: File) => {
    setUploadLoading(true);
    try {
      const response = await uploadApi.uploadImage(file) as any;
      let url: string | null = null;
      if (typeof response === 'string') {
        url = response;
      } else if (response?.url) {
        url = response.url;
      } else if (response?.data?.url) {
        url = response.data.url;
      } else if (response?.data?.data?.url) {
        url = response.data.data.url;
      } else if (response?.data) {
        if (typeof response.data === 'string') {
          url = response.data;
        } else if (response.data.data && typeof response.data.data === 'string') {
          url = response.data.data;
        }
      }
      if (url) {
        form.setFieldsValue({ cover: url });
        setCoverUrl(url);
        success('图片上传成功');
      } else {
        error('上传成功但未返回图片URL');
      }
    } catch (err: any) {
      error(err.response?.data?.msg || '上传失败');
    } finally {
      setUploadLoading(false);
    }
    return false;
  };

  const columns: ColumnsType<Topic> = [
    {
      title: '封面',
      dataIndex: 'cover',
      key: 'cover',
      width: 80,
      render: (url: string) => url ? (
        <Image width={60} height={60} src={url} style={{ borderRadius: 6, objectFit: 'cover' }} />
      ) : '-',
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '简介',
      dataIndex: 'brief',
      key: 'brief',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '排序',
      dataIndex: 'orderon',
      key: 'orderon',
      width: 120,
      render: (orderon: number | undefined, record: Topic) => (
        <InputNumber
          min={0}
          max={9999}
          value={orderon}
          placeholder="未设置"
          style={{ width: 90 }}
          onBlur={(e) => handleOrderChange(record, e.target.value ? parseInt(e.target.value) : null)}
          onPressEnter={(e) => {
            const value = (e.target as HTMLInputElement).value;
            handleOrderChange(record, value ? parseInt(value) : null);
          }}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TopicStatus, record: Topic) => (
        <Switch
          checked={status === TopicStatus.ENABLED}
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

  const uploadButton = (
    <div style={{
      width: '100%',
      height: 180,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px dashed #d9d9d9',
      borderRadius: 4,
      cursor: 'pointer',
      background: '#fafafa',
    }}>
      <UploadOutlined style={{ fontSize: 40 }} />
      <div style={{ marginTop: 12 }}>点击上传并裁剪</div>
    </div>
  );

  return (
    <>
      <StandardPage
        title="话题管理"
        description="管理平台话题信息，包括话题的增删改查等功能。"
        showRefreshButton={true}
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加话题"
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
        title={editingTopic ? '编辑话题' : '添加话题'}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入话题标题' }]}
          >
            <Input placeholder="请输入话题标题" maxLength={50} showCount />
          </Form.Item>

          <Form.Item
            label="封面图"
            extra="建议尺寸：400 × 400 像素，支持裁剪"
          >
            <Input type="hidden" value={coverUrl} />
            <div>
              {coverUrl ? (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      width: 200,
                      height: 200,
                      background: '#f0f0f0',
                      borderRadius: 4,
                      overflow: 'hidden',
                      border: '1px solid #d9d9d9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={coverUrl}
                      alt="cover"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <Space style={{ marginTop: 8 }}>
                    <Button type="primary" onClick={() => setPreviewImage(coverUrl)}>
                      预览
                    </Button>
                    <ImgCrop
                      aspect={1}
                      quality={0.9}
                      zoomSlider
                      rotationSlider
                      showReset
                      modalTitle="裁剪封面图"
                      modalOk="确定"
                      modalCancel="取消"
                      beforeCrop={(file) => {
                        if (!file.type.startsWith('image/')) {
                          error('只能上传图片文件');
                          return false;
                        }
                        if (file.size / 1024 / 1024 >= 5) {
                          error('图片大小不能超过5MB');
                          return false;
                        }
                        return true;
                      }}
                    >
                      <Upload showUploadList={false} beforeUpload={handleUpload}>
                        <Button icon={<ScissorOutlined />} loading={uploadLoading}>
                          重新裁剪上传
                        </Button>
                      </Upload>
                    </ImgCrop>
                    <Button danger onClick={() => {
                      form.setFieldsValue({ cover: '' });
                      setCoverUrl('');
                    }}>
                      删除
                    </Button>
                  </Space>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <ImgCrop
                    aspect={1}
                    quality={0.9}
                    zoomSlider
                    rotationSlider
                    showReset
                    modalTitle="裁剪封面图"
                    modalOk="确定"
                    modalCancel="取消"
                    beforeCrop={(file) => {
                      if (!file.type.startsWith('image/')) {
                        error('只能上传图片文件');
                        return false;
                      }
                      if (file.size / 1024 / 1024 >= 5) {
                        error('图片大小不能超过5MB');
                        return false;
                      }
                      return true;
                    }}
                  >
                    <Upload showUploadList={false} beforeUpload={handleUpload} style={{ width: '100%' }}>
                      {uploadButton}
                    </Upload>
                  </ImgCrop>
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item
            name="brief"
            label="简介"
            rules={[{ required: true, message: '请输入话题简介' }]}
          >
            <Input.TextArea rows={2} placeholder="请输入话题简介" maxLength={200} showCount />
          </Form.Item>

          {!editingTopic && (
            <Form.Item
              name="orderon"
              label="排序"
              extra="数字越小排序越靠前"
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
            </Form.Item>
          )}

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            getValueFromEvent={(checked) => checked ? TopicStatus.ENABLED : TopicStatus.DISABLED}
            getValueProps={(value) => ({ checked: value === TopicStatus.ENABLED })}
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button type="primary" onClick={handleSave} loading={submitting}>
                保存
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {editingTopic && (
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
            <Typography.Title level={5} style={{ marginBottom: 12 }}>关联活动</Typography.Title>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {relatedEvents.length === 0 ? (
                  <span style={{ color: '#999' }}>暂无关联活动</span>
                ) : (
                  relatedEvents.map((event, index) => (
                    <Tag
                      key={event.id}
                      draggable
                      closable
                      onClose={() => handleRemoveEventRelation(event.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 14,
                        cursor: 'grab',
                        opacity: dragIndex === index ? 0.5 : 1,
                        borderColor: dragOverIndex === index ? '#1890ff' : undefined,
                      }}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      {event.event_data?.title || event.title || `活动${event.eventid}`}
                    </Tag>
                  ))
                )}
              </div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>拖动可调整顺序</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Select
                style={{ width: 300 }}
                placeholder="选择进行中的活动"
                value={selectedEventId}
                onChange={setSelectedEventId}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={selectableEvents.map(item => ({
                  value: item.id,
                  label: item.title,
                }))}
              />
              <Button type="primary" onClick={handleAddEventRelation}>
                添加
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!previewImage}
        footer={null}
        onCancel={() => setPreviewImage('')}
        centered
        width="auto"
        styles={{ body: { padding: 0 } }}
      >
        <img alt="预览" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} src={previewImage} />
      </Modal>
    </>
  );
};

export default TopicManagement;
