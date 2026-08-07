import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Switch, InputNumber, Space, Form, Input, DatePicker, Radio, Tag, Image } from 'antd';
import { statusSwitchColumn, dateTimeColumn } from '@/components/templates/ColumnHelpers';
import type { ColumnsType } from 'antd/es/table';
import { BannerStatus, BannerLinkType, BannerLinkTypeLabels } from '@shared/constants';
import { getFullWidthUrl } from '@/utils/imageUtils';
import { bannerApi, Banner, CreateBannerRequest } from '@/api/services/banner';
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
  { label: '上线', value: BannerStatus.ONLINE },
  { label: '下线', value: BannerStatus.OFFLINE },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
];

const BannerManagement = () => {
  const { success, error: showError } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [linkType, setLinkType] = useState<number>(BannerLinkType.NONE);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [form] = Form.useForm();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchBanners = useCallback(async (params: any) => {
    return bannerApi.getBanners({
      page: params.page,
      size: params.page_size,
      status: params.status,
    });
  }, []);

  const formatBannerResponse = useCallback((res: any) => {
    const list = res?.list || [];
    const total = res?.total ?? 0;
    return { list, count: total };
  }, []);

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
      await bannerApi.toggleBannerStatus(record.id, checked ? BannerStatus.ONLINE : BannerStatus.OFFLINE);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  // 权重修改
  const handleSortChange = async (record: Banner, value: number | null) => {
    try {
      await bannerApi.updateBanner(record.id, { sort_order: value ?? undefined });
      success('权重更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '权重更新失败');
    }
  };

  const handleAdd = () => {
    setEditingBanner(null);
    setLinkType(BannerLinkType.NONE);
    setStatusEnabled(true);
    setModalVisible(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleEdit = async (record: Banner) => {
    setEditingBanner(record);
    setLoadingDetail(true);
    try {
      const detail: any = await bannerApi.getBannerDetail(record.id);
      const bannerData = detail || record;
      setEditingBanner(bannerData);
      setStatusEnabled(bannerData.status === BannerStatus.ONLINE);
      setLinkType(bannerData.link_type ?? BannerLinkType.NONE);
      setModalVisible(true);
      setTimeout(() => {
        form.setFieldsValue({
          title: bannerData.title || '',
          cover: bannerData.cover || '',
          link_data: bannerData.link_data || '',
          start_at: bannerData.start_at ? dayjs(bannerData.start_at) : null,
          end_at: bannerData.end_at ? dayjs(bannerData.end_at) : null,
          sort_order: bannerData.sort_order,
        });
      }, 0);
    } catch {
      setStatusEnabled(record.status === BannerStatus.ONLINE);
      setLinkType(record.link_type ?? BannerLinkType.NONE);
      setModalVisible(true);
      setTimeout(() => {
        form.setFieldsValue({
          title: record.title || '',
          cover: record.cover || '',
          link_data: record.link_data || '',
          sort_order: record.sort_order,
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
        cover: values.cover || '',
        link_type: linkType,
        link_data: linkType !== BannerLinkType.NONE ? (values.link_data || '') : '',
        status: statusEnabled ? BannerStatus.ONLINE : BannerStatus.OFFLINE,
        sort_order: values.sort_order ?? undefined,
        start_at: values.start_at ? (values.start_at as Dayjs).toISOString() : undefined,
        end_at: values.end_at ? (values.end_at as Dayjs).toISOString() : undefined,
      };

      if (editingBanner) {
        await bannerApi.updateBanner(editingBanner.id, payload);
        // 状态单独更新
        const newStatus = statusEnabled ? BannerStatus.ONLINE : BannerStatus.OFFLINE;
        if (newStatus !== editingBanner.status) {
          await bannerApi.toggleBannerStatus(editingBanner.id, newStatus);
        }
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

  const handleLinkTypeChange = (value: number) => {
    setLinkType(value);
    if (value === BannerLinkType.NONE) {
      form.setFieldsValue({ link_data: '' });
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
      dataIndex: 'cover',
      key: 'cover',
      width: 160,
      render: (url: string) => (
        url
          ? <Image src={getFullWidthUrl(url)} alt="banner" preview={{ src: url }} style={{ height: 50, objectFit: 'contain', borderRadius: 4 }} />
          : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '链接类型',
      dataIndex: 'link_type',
      key: 'link_type',
      width: 100,
      render: (v: number) => <Tag title={BannerLinkTypeLabels[v]}>{BannerLinkTypeLabels[v] ?? v}</Tag>,
    },
    {
      title: '权重',
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
              handleSortChange(record, num);
            }
          }}
        />
      ),
    },
    statusSwitchColumn<Banner>('status', BannerStatus.ONLINE, BannerStatus.OFFLINE, handleStatusToggle, '上线', '下线', 100),
    dateTimeColumn<Banner>('created_at', '创建时间'),
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
        description="管理首页轮播广告位，设置图片、跳转链接和展示时间。"
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
          scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }, { max: 128, message: '最多128个字符' }]}
          >
            <Input placeholder="请输入轮播图标题" maxLength={128} showCount />
          </Form.Item>

          <Form.Item
            label="封面图"
            name="cover"
            rules={[{ required: true, message: '请上传封面图' }]}
          >
            <CropperImageUpload aspect={600 / 200} sizeHint="建议尺寸：600 × 200 像素" />
          </Form.Item>

          <Form.Item label="链接类型" required>
            <Radio.Group value={linkType} onChange={(e) => handleLinkTypeChange(e.target.value)}>
              <Radio.Button value={BannerLinkType.NONE}>{BannerLinkTypeLabels[BannerLinkType.NONE]}</Radio.Button>
              <Radio.Button value={BannerLinkType.EXTERNAL}>{BannerLinkTypeLabels[BannerLinkType.EXTERNAL]}</Radio.Button>
              <Radio.Button value={BannerLinkType.INTERNAL}>{BannerLinkTypeLabels[BannerLinkType.INTERNAL]}</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {linkType !== BannerLinkType.NONE && (
            <Form.Item
              label={linkType === BannerLinkType.EXTERNAL ? '外链地址' : '内部页面路径'}
              name="link_data"
              rules={[{ required: true, message: '请输入链接地址' }, { max: 2048, message: '最多2048个字符' }]}
              extra={linkType === BannerLinkType.INTERNAL ? '如: /pages/activity/detail?id=123' : '如: https://example.com'}
            >
              <Input placeholder={linkType === BannerLinkType.EXTERNAL ? '请输入完整 URL' : '请输入小程序页面路径'} />
            </Form.Item>
          )}

          <Form.Item label="展示开始时间" name="start_at" extra="不填写则不限">
            <DatePicker showTime format="YYYY/MM/DD HH:mm:ss" placeholder="选择开始时间" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="展示结束时间" name="end_at" extra="不填写则不限">
            <DatePicker showTime format="YYYY/MM/DD HH:mm:ss" placeholder="选择结束时间" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="权重" name="sort_order" extra="数字越大排序越靠前">
            <InputNumber min={0} precision={0} placeholder="请输入权重" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="状态">
            <Switch
              checked={statusEnabled}
              onChange={setStatusEnabled}
              checkedChildren="上线"
              unCheckedChildren="下线"
            />
          </Form.Item>
        </Form>
      </ScrollableModal>
    </>
  );
};

export default BannerManagement;
