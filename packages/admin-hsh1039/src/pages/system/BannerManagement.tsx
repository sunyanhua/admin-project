import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Card, Table, Tag, Typography, Grid, Space, Modal, Form, Input, Switch, Radio, InputNumber, Upload, Image, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ScissorOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { BannerStatus, BannerLinkType, BannerLinkTypeLabels } from '@shared/constants';
import { bannerApi } from '../../api/services/banner';
import { uploadApi } from '../../api/services/upload';
import ImgCrop from 'antd-img-crop';

import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { AddEditModal } from '@/components/templates/AddEditModal';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const { useBreakpoint } = Grid;
const { Title } = Typography;

// Banner数据类型
interface Banner {
  id: number;
  title: string;
  cover: string;
  linkType: BannerLinkType;
  linkData: string;
  orderon?: number;
  status: BannerStatus;
  inserton?: string;
}

const BannerManagement = () => {
  const { success, error, warning, info } = useAppNotification();
const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form] = Form.useForm();
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchBanners = useCallback(async (params: any) => {
    return bannerApi.getBanners(params);
  }, []);

  const formatBannerResponse = useCallback((res: any) => ({
    list: (res?.data?.list || res?.data || []).map((item: any) => ({
      id: item.id,
      title: item.title || '',
      cover: item.cover || '',
      link_type: item.link_type ?? item.linkType ?? BannerLinkType.NO_LINK,
      link_data: (item.link_data ?? item.linkData) || '',
      orderon: item.orderon,
      status: item.status ?? BannerStatus.ENABLED,
      inserton: item.inserton,
    })),
    count: res?.data?.count || res?.count || 0,
  }), []);

  const {
    data,
    loading,
    pagination,
    onPageChange,
    refresh,
    search,
  } = useListPage<Banner>({
    fetchFn: fetchBanners,
    formatResponse: formatBannerResponse,
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

  // 处理状态切换
  const handleStatusToggle = async (record: Banner, checked: boolean) => {
    try {
      await bannerApi.updateBannerStatus(record.id, checked ? BannerStatus.ENABLED : BannerStatus.DISABLED);
      success('状态更新成功');
      refresh();
    } catch (error: any) {
      error(error.response?.data?.msg || '状态更新失败');
    }
  };

  // 处理排序修改
  const handleOrderChange = async (record: Banner, value: number | null) => {
    try {
      await bannerApi.updateBannerOrder(record.id, value ?? undefined);
      success('排序更新成功');
      refresh();
    } catch (error: any) {
      error(error.response?.data?.msg || '排序更新失败');
    }
  };

  // 列配置
  const columns: ColumnsType<Banner> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '预览',
      dataIndex: 'cover',
      key: 'cover',
      width: 120,
      render: (url: string) => (
        <div style={{ width: 100, height: 50, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
          {url ? (
            <img
              src={url}
              alt="banner"
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => setPreviewImage(url)}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>
              无图片
            </div>
          )}
        </div>
      ),
    },
    {
      title: '排序',
      dataIndex: 'orderon',
      key: 'orderon',
      width: 120,
      render: (orderon: number | undefined, record: Banner) => (
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
      render: (status: BannerStatus, record: Banner) => (
        <Switch
          checked={status === BannerStatus.ENABLED}
          onChange={(checked) => handleStatusToggle(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    ActionColumn({
      onEdit: (record) => {
        setEditingBanner(record);
        setCoverUrl(record.cover || '');
        setModalVisible(true);
        setTimeout(() => {
          form.setFieldsValue({
            title: record.title,
            cover: record.cover,
            linkType: record.link_type ?? record.linkType,
            linkData: record.link_data ?? record.linkData,
            orderon: record.orderon,
            status: record.status,
          });
        }, 0);
      },
      onDelete: (record) => confirmDelete({
        name: record.title,
        deleteFn: () => bannerApi.deleteBanner(record.id),
        onSuccess: refresh,
      }),
      showView: false,
    }),
  ];

  const handleAdd = () => {
    setEditingBanner(null);
    setCoverUrl('');
    setModalVisible(true);
    setTimeout(() => {
      form.resetFields();
    }, 0);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!coverUrl) {
        error('请上传封面图');
        return;
      }

      const submitData: Record<string, any> = {
        ...values,
        cover: coverUrl,
      };

      // 转换为 snake_case 字段名
      if (submitData.linkType !== undefined) {
        submitData.link_type = submitData.linkType;
        delete submitData.linkType;
      }
      if (submitData.linkData !== undefined) {
        submitData.link_data = submitData.linkData;
        delete submitData.linkData;
      }

      if (editingBanner) {
        await bannerApi.updateBanner(editingBanner.id, submitData);
        success('更新成功');
      } else {
        await bannerApi.createBanner(submitData);
        success('添加成功');
      }
      setModalVisible(false);
      refresh();
    } catch (error: any) {
      if (error.errorFields) return;
      error(error.response?.data?.msg || '操作失败');
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
    } catch (error: any) {
      error(error.response?.data?.msg || '上传失败');
    } finally {
      setUploadLoading(false);
    }
    return false;
  };

  // 处理链接类型变化
  const handleLinkTypeChange = (value: BannerLinkType) => {
    if (value === BannerLinkType.NO_LINK) {
      form.setFieldsValue({ linkData: '' });
    }
  };

  // 图片上传按钮
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
        title="轮播图管理"
        description="管理App首页轮播图，设置轮播图的标题、图片、链接等信息。"
        showRefreshButton={true}
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加轮播图"
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

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingBanner ? '编辑轮播图' : '添加轮播图'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={isMobile ? '90%' : 600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            linkType: BannerLinkType.NO_LINK,
            status: BannerStatus.ENABLED,
          }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入轮播图标题" maxLength={100} showCount />
          </Form.Item>

          <Form.Item
            label="封面图"
            extra="建议尺寸：398 × 170 像素，支持裁剪"
          >
            <Input type="hidden" value={coverUrl} />
            <div>
              {coverUrl ? (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      width: '100%',
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
                      alt="banner"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <Space style={{ marginTop: 8 }}>
                    <Button type="primary" onClick={() => setPreviewImage(coverUrl)}>
                      预览
                    </Button>
                    <ImgCrop
                      aspect={398 / 170}
                      quality={0.9}
                      zoomSlider
                      rotationSlider
                      showReset
                      modalTitle="裁剪轮播图"
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
                    aspect={398 / 170}
                    quality={0.9}
                    zoomSlider
                    rotationSlider
                    showReset
                    modalTitle="裁剪轮播图"
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
            name="linkType"
            label="链接类型"
            rules={[{ required: true, message: '请选择链接类型' }]}
          >
            <Radio.Group onChange={(e) => handleLinkTypeChange(e.target.value)}>
              <Radio.Button value={BannerLinkType.MINIAPP_LINK}>小程序链接</Radio.Button>
              <Radio.Button value={BannerLinkType.NO_LINK}>无链接</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.linkType !== currentValues.linkType}
          >
            {({ getFieldValue }) => {
              const linkType = getFieldValue('linkType');
              return linkType === BannerLinkType.MINIAPP_LINK ? (
                <Form.Item
                  name="linkData"
                  label="跳转链接"
                  rules={[{ required: true, message: '请输入跳转链接' }]}
                  extra="请输入小程序页面路径，如: /pages/activity/detail?id=123"
                >
                  <Input placeholder="请输入小程序页面路径" maxLength={500} showCount />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>

          {!editingBanner && (
            <Form.Item
              name="orderon"
              label="排序"
              extra="数字越小排序越靠前，留空则按创建时间排序"
            >
              <InputNumber min={0} max={9999} placeholder="请输入排序序号" style={{ width: '100%' }} />
            </Form.Item>
          )}

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            getValueFromEvent={(checked) => checked ? BannerStatus.ENABLED : BannerStatus.DISABLED}
            getValueProps={(value) => ({ checked: value === BannerStatus.ENABLED })}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 图片预览弹窗 */}
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

export default BannerManagement;
