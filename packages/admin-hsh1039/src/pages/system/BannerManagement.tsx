import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Switch, InputNumber, Tag, Space, Form, Input, Select, DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BannerStatus, BannerPosition, BannerPositionLabels } from '@shared/constants';
import { getFullWidthUrl } from '@/utils/imageUtils';
import { bannerApi, Banner, CreateBannerRequest, UpdateBannerRequest } from '@/api/services/banner';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import ScrollableModal from '@/components/templates/ScrollableModal';
import dayjs, { Dayjs } from 'dayjs';

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const POSITION_OPTIONS = [
  { label: '首页', value: BannerPosition.HOME },
  { label: '活动页', value: BannerPosition.ACTIVITY },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const BannerManagement = () => {
  const { success, error: showError } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form] = Form.useForm();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchBanners = useCallback(async (params: any) => {
    return bannerApi.getBanners(params);
  }, []);

  const formatBannerResponse = useCallback((res: any) => ({
    list: (res?.data?.list || []).map((item: any) => ({
      ...item,
      link_url: item.link_url || '',
      sort_order: item.sort_order,
      position: item.position || '',
    })),
    count: res?.data?.total || 0,
  }), []);

  const {
    data,
    loading: listLoading,
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

  // 状态切换
  const handleStatusToggle = async (record: Banner, checked: boolean) => {
    try {
      await bannerApi.updateBanner(record.id, { status: checked ? BannerStatus.ENABLED : BannerStatus.DISABLED });
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  // 排序修改
  const handleOrderChange = async (record: Banner, value: number | null) => {
    try {
      await bannerApi.updateBanner(record.id, { sort_order: value ?? undefined });
      success('排序更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '排序更新失败');
    }
  };

  const handleAdd = () => {
    setEditingBanner(null);
    setModalVisible(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleEdit = async (record: Banner) => {
    setEditingBanner(record);
    setLoadingDetail(true);
    try {
      const res: any = await bannerApi.getBannerDetail(record.id);
      const detail = res?.data || res || {};
      const bannerData = { ...record, ...detail };
      setEditingBanner(bannerData);
      setModalVisible(true);
      setTimeout(() => {
        form.setFieldsValue({
          title: bannerData.title || '',
          image_url: bannerData.image_url || '',
          link_url: bannerData.link_url || '',
          position: bannerData.position || undefined,
          start_time: bannerData.start_time ? dayjs(bannerData.start_time) : null,
          end_time: bannerData.end_time ? dayjs(bannerData.end_time) : null,
          sort_order: bannerData.sort_order,
          status: bannerData.status ?? BannerStatus.ENABLED,
        });
      }, 0);
    } catch {
      // 详情获取失败时用列表数据回填
      setModalVisible(true);
      setTimeout(() => {
        form.setFieldsValue({
          title: record.title || '',
          image_url: record.image_url || '',
          link_url: record.link_url || '',
          position: record.position || undefined,
          sort_order: record.sort_order,
          status: record.status ?? BannerStatus.ENABLED,
        });
      }, 0);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateBannerRequest = {
        title: values.title,
        image_url: values.image_url,
        link_url: values.link_url || undefined,
        position: values.position || undefined,
        sort_order: values.sort_order ?? undefined,
        status: values.status ?? BannerStatus.ENABLED,
        start_time: values.start_time ? (values.start_time as Dayjs).format('YYYY/MM/DD HH:mm:ss') : undefined,
        end_time: values.end_time ? (values.end_time as Dayjs).format('YYYY/MM/DD HH:mm:ss') : undefined,
      };

      if (editingBanner) {
        await bannerApi.updateBanner(editingBanner.id, payload as UpdateBannerRequest);
        success('更新成功');
      } else {
        await bannerApi.createBanner(payload);
        success('添加成功');
      }
      setModalVisible(false);
      refresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<Banner> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text}</span>,
    },
    {
      title: '封面',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 80,
      render: (url: string) => (
        <div style={{ width: 60, height: 35, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
          {url ? (
            <img
              src={getFullWidthUrl(url)}
              alt="banner"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 10 }}>—</div>
          )}
        </div>
      ),
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      width: 90,
      render: (pos: string) => (
        <Tag color={pos === 'activity' ? 'green' : 'blue'} title={BannerPositionLabels[pos] || pos}>
          {BannerPositionLabels[pos] || pos || '-'}
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (orderon: number | undefined, record: Banner) => (
        <InputNumber
          min={0}
          value={orderon}
          style={{ width: 70 }}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? null : parseInt(val);
            if (num !== (record.sort_order ?? null)) {
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
      render: (status: number, record: Banner) => (
        <Switch
          checked={status === BannerStatus.ENABLED}
          onChange={(checked) => handleStatusToggle(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    ActionColumn({
      onEdit: (record) => handleEdit(record),
      onDelete: (record) => confirmDelete({
        name: record.title,
        deleteFn: () => bannerApi.deleteBanner(record.id),
        onSuccess: refresh,
      }),
      showView: false,
    }),
  ];

  return (
    <>
      <StandardPage
        title="轮播图管理"
        description="管理首页及各页面的轮播图，设置图片、跳转链接和展示时间。"
        showRefreshButton
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
            loading={listLoading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        }
      />

      <ScrollableModal
        title={editingBanner ? '编辑轮播图' : '添加轮播图'}
        open={modalVisible}
        onCancel={() => { form.resetFields(); setModalVisible(false); }}
        width={720}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={() => { form.resetFields(); setModalVisible(false); }}>取消</Button>
            <Button type="primary" loading={loading} onClick={() => form.submit()}>
              {editingBanner ? '保存' : '创建'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          initialValues={{ status: BannerStatus.ENABLED }}
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入轮播图标题" maxLength={64} showCount />
          </Form.Item>

          <Form.Item
            label="封面图"
            name="image_url"
            rules={[{ required: true, message: '请上传封面图' }]}
          >
            <CropperImageUpload aspect={430 / 175} sizeHint="建议尺寸：430 × 175 像素" />
          </Form.Item>

          <Form.Item
            label="跳转链接"
            name="link_url"
            rules={[{ max: 512, message: '最多512个字符' }]}
          >
            <Input placeholder="请输入跳转链接（选填）" />
          </Form.Item>

          <Form.Item
            label="展示位置"
            name="position"
          >
            <Select
              placeholder="请选择展示位置"
              options={POSITION_OPTIONS}
              allowClear
            />
          </Form.Item>

          <Form.Item label="展示开始时间" name="start_time">
            <DatePicker showTime format="YYYY/MM/DD HH:mm:ss" placeholder="选择开始时间" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="展示结束时间" name="end_time">
            <DatePicker showTime format="YYYY/MM/DD HH:mm:ss" placeholder="选择结束时间" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="排序" name="sort_order" extra="数字越小排序越靠前">
            <InputNumber min={0} precision={0} placeholder="请输入排序序号" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            valuePropName="checked"
            getValueFromEvent={(checked: boolean) => checked ? BannerStatus.ENABLED : BannerStatus.DISABLED}
            getValueProps={(value: number) => ({ checked: value === BannerStatus.ENABLED })}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </ScrollableModal>
    </>
  );
};

export default BannerManagement;
