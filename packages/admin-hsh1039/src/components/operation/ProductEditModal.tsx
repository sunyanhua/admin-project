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

interface ProductDetailDesc {
  detail?: string;
  hasagreement?: boolean;
  agreement?: string;
}

interface ActivityIntroItem {
  title: string;
  content: string;
  showonlist: string;
  zuobiao?: string;
}

function buildIntroFromSubTitle(subTitle: string): string {
  const lines = (subTitle || '').split('\n');
  const items: ActivityIntroItem[] = [
    { title: '简介1', content: (lines[0] || '').trim(), showonlist: 'true' },
    { title: '简介2', content: (lines[1] || '').trim(), showonlist: 'true' },
  ];
  return JSON.stringify(items);
}

export interface ProductEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  event: Product | null;
  categoryOptions: CategoryOption[];
  loadingDetail?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function parseDetailDesc(json?: string): ProductDetailDesc {
  if (!json) return {};
  let decoded = json;
  decoded = decoded.replace(/&(?:#34|quot);/g, '"');
  decoded = decoded.replace(/\\\\"/g, '\\"');
  try { return JSON.parse(decoded); } catch { return {}; }
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({
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
          detail: desc.detail || '',
          hasagreement: desc.hasagreement || false,
          agreement: desc.agreement || '',
          is_visible: event.is_visible !== false,
          sort_order: event.sort_order ?? 0,
        });
      } else {
        form.resetFields();
        setHasAgreement(false);
        form.setFieldsValue({ is_visible: true, sort_order: 0 });
      }
    }
  }, [visible, event, isCreate, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const sub_title = values.sub_title || '';
      const intro = buildIntroFromSubTitle(sub_title);

      const detailDesc: ProductDetailDesc = {
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
          sub_title,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
          intro,
          detail_desc,
          is_virtual: false,
          is_listed: false,
          is_visible: values.is_visible ?? true,
          sort_order: values.sort_order ?? 0,
        });
        success('商品创建成功');
      } else {
        if (!event) return;
        await productApi.updateProduct(event.id, {
          title: values.title,
          sub_title,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
          intro,
          detail_desc,
          is_visible: values.is_visible,
          sort_order: values.sort_order ?? undefined,
        });
        success('商品更新成功');
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
      title={isCreate ? '添加商品' : '编辑商品'}
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
        <Form.Item label="商品名称" name="title"
          rules={[{ required: true, message: '请输入商品名称' }, { max: 128, message: '最多128个字符' }]}>
          <Input placeholder="请输入商品名称" />
        </Form.Item>

        <Form.Item label="商品简介" name="sub_title"
          rules={[{ required: true, message: '请输入商品简介' }, { max: 512, message: '最多512个字符' }]}>
          <Input.TextArea rows={2} placeholder={'请在此输入商品简介\n第一行自动保存为"简介1"，第二行自动保存为"简介2"'} />
        </Form.Item>

        <Form.Item label="所属分类" name="category_id"
          rules={[{ required: true, message: '请选择分类' }]}>
          <Select placeholder="请选择分类" options={categoryOptions.map((c) => ({ label: c.name, value: c.id }))} />
        </Form.Item>

        <Form.Item label="商品封面" name="cover_image"
          rules={[{ required: true, message: '请上传商品封面' }]}>
          <CropperImageUpload aspect={1} sizeHint="建议尺寸：400 × 400 像素" />
        </Form.Item>

        <Form.Item label="商品图片" name="carousel_images"
          rules={[{ required: true, message: '请上传商品图片' }]}>
          <MultiImageUpload cropAspect={800 / 400} cropSizeHint="建议尺寸：800 × 400 像素" />
        </Form.Item>

        <Form.Item label="商品介绍" name="detail"
          rules={[{ required: true, message: '请输入商品介绍' }]}>
          <RichTextEditor placeholder="请输入商品详细介绍" />
        </Form.Item>

        <Form.Item label="是否有购买协议" name="hasagreement" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否"
            onChange={(c) => setHasAgreement(c)} />
        </Form.Item>

        {hasAgreement && (
          <Form.Item label="购买协议内容" name="agreement">
            <RichTextEditor placeholder="请输入购买协议内容" />
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

export default ProductEditModal;
