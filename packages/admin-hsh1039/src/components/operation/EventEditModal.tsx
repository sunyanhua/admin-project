import { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, InputNumber, Button, Space, Spin } from 'antd';
import { productApi, Product } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';
import ScrollableModal from '@/components/templates/ScrollableModal';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import MultiImageUpload from '@/components/common/MultiImageUpload';
import { RichTextEditor } from '@/components/templates/RichTextEditor';

interface CategoryOption {
  id: number;
  name: string;
}

interface EventDetailDesc {
  datetime?: string;
  detail?: string;
  hasagreement?: boolean;
  agreement?: string;
}

export interface EventEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  event: Product | null;
  categoryOptions: CategoryOption[];
  loadingDetail?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function parseDetailDesc(json?: string): EventDetailDesc {
  if (!json) return {};
  // 服务端可能返回 HTML 转义的引号，以及 extra \ 转义，统一还原
  let decoded = json;
  // 处理服务器端 HTML 编码: &#34; / &quot; → "
  decoded = decoded.replace(/&(?:#34|quot);/g, '"');
  // 处理 \\" → \" (JSON 内层转义被服务器二次加反斜杠)
  decoded = decoded.replace(/\\\\"/g, '\\"');
  try { return JSON.parse(decoded); } catch { return {}; }
}

const EventEditModal: React.FC<EventEditModalProps> = ({
  visible, mode, event, categoryOptions, loadingDetail = false, onClose, onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasAgreement, setHasAgreement] = useState(false);
  const { success, error: showError } = useAppNotification();
  const isCreate = mode === 'create';

  useEffect(() => {
    if (visible) {
      if (event && !isCreate) {
        const desc = parseDetailDesc(event.detail_desc);
        setHasAgreement(desc.hasagreement || false);
        form.setFieldsValue({
          title: event.title || '',
          sub_title: event.sub_title || '',
          category_id: event.category_id ?? undefined,
          cover_image: event.cover_image || '',
          carousel_images: event.carousel_images || [],
          datetime: desc.datetime || '',
          detail: desc.detail || '',
          hasagreement: desc.hasagreement || false,
          agreement: desc.agreement || '',
          is_listed: event.is_listed === true,
          is_visible: event.is_visible !== false,
          sort_order: event.sort_order ?? 0,
        });
      } else {
        form.resetFields();
        setHasAgreement(false);
        form.setFieldsValue({ is_visible: true, sort_order: 0, is_listed: false });
      }
    }
  }, [visible, event, isCreate, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const detailDesc: EventDetailDesc = {
        datetime: values.datetime || undefined,
        detail: values.detail || undefined,
        hasagreement: values.hasagreement || false,
      };
      if (values.hasagreement && values.agreement) {
        detailDesc.agreement = values.agreement;
      }
      const detail_desc = JSON.stringify(detailDesc);

      if (isCreate) {
        await productApi.createProduct({
          title: values.title,
          sub_title: values.sub_title || undefined,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
          detail_desc,
          is_virtual: true,
          is_listed: false,
          is_visible: values.is_visible ?? true,
          sort_order: values.sort_order ?? 0,
        });
        success('活动创建成功');
      } else {
        if (!event) return;
        await productApi.updateProduct(event.id, {
          title: values.title,
          sub_title: values.sub_title || undefined,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
          detail_desc,
          is_listed: values.is_listed,
          is_visible: values.is_visible,
          sort_order: values.sort_order ?? undefined,
        });
        success('活动更新成功');
      }
      form.resetFields();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || (isCreate ? '创建失败' : '更新失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableModal
      title={isCreate ? '添加活动' : '编辑活动'}
      open={visible}
      onCancel={() => { form.resetFields(); onClose(); }}
      width={720}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>取消</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {isCreate ? "创建" : "保存"}
          </Button>
        </Space>
      }
    >
      <Spin spinning={loadingDetail} tip="加载中...">
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item label="活动名称" name="title"
          rules={[{ required: true, message: '请输入活动名称' }, { max: 128, message: '最多128个字符' }]}>
          <Input placeholder="请输入活动名称" />
        </Form.Item>

        <Form.Item label="活动简介" name="sub_title"
          rules={[{ max: 256, message: '最多256个字符' }]}>
          <Input placeholder="请输入活动简介（选填）" />
        </Form.Item>

        <Form.Item label="所属分类" name="category_id"
          rules={[{ required: true, message: '请选择分类' }]}>
          <Select placeholder="请选择分类" options={categoryOptions.map((c) => ({ label: c.name, value: c.id }))} />
        </Form.Item>

        <Form.Item label="活动封面" name="cover_image"
          rules={[{ required: true, message: '请上传活动封面' }]}>
          <CropperImageUpload />
        </Form.Item>

        <Form.Item label="活动图片" name="carousel_images">
          <MultiImageUpload />
        </Form.Item>

        <Form.Item label="活动时间" name="datetime"
          rules={[{ required: true, message: '请输入活动时间' }]}>
          <Input placeholder="如：2026年7月15日 14:00 - 16:00" />
        </Form.Item>

        <Form.Item label="活动介绍" name="detail"
          rules={[{ required: true, message: '请输入活动介绍' }]}>
          <RichTextEditor placeholder="请输入活动详细介绍" />
        </Form.Item>

        <Form.Item label="是否有报名协议" name="hasagreement" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否"
            onChange={(c) => setHasAgreement(c)} />
        </Form.Item>

        {hasAgreement && (
          <Form.Item label="报名协议内容" name="agreement">
            <RichTextEditor placeholder="请输入报名协议内容" />
          </Form.Item>
        )}

        {!isCreate && (
          <Form.Item label="上架/下架" name="is_listed" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        )}

        <Form.Item label="显示/隐藏" name="is_visible" valuePropName="checked">
          <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
        </Form.Item>

        <Form.Item label="权重" name="sort_order" rules={[{ required: true, message: '请输入权重' }, { type: 'integer', message: '请输入整数' }]} extra="权重越大排序越靠前，默认为0">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
      </Spin>
    </ScrollableModal>
  );
};

export default EventEditModal;
