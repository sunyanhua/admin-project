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

interface TicketDetailDesc {
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

export interface TicketEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  event: Product | null;
  categoryOptions: CategoryOption[];
  loadingDetail?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function parseDetailDesc(json?: string): TicketDetailDesc {
  if (!json) return {};
  let decoded = json;
  decoded = decoded.replace(/&(?:#34|quot);/g, '"');
  decoded = decoded.replace(/\\\\"/g, '\\"');
  try { return JSON.parse(decoded); } catch { return {}; }
}

function parseIntro(json?: string): ActivityIntroItem[] {
  if (!json) return [];
  let decoded = json;
  decoded = decoded.replace(/&(?:#34|quot);/g, '"');
  decoded = decoded.replace(/\\\\"/g, '\\"');
  try { return JSON.parse(decoded); } catch { return []; }
}

const TicketEditModal: React.FC<TicketEditModalProps> = ({
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
        const introItems = parseIntro(event.intro);
        setHasAgreement(desc.hasagreement || false);
        form.setFieldsValue({
          title: event.title || '',
          sub_title: event.sub_title || '',
          category_id: event.category_id ?? undefined,
          cover_image: event.cover_image || '',
          carousel_images: event.carousel_images || [],
          usage_note: introItems.find((i: ActivityIntroItem) => i.title === '使用说明')?.content || '',
          usage_address: introItems.find((i: ActivityIntroItem) => i.title === '使用地点')?.content || '',
          usage_coordinate: introItems.find((i: ActivityIntroItem) => i.title === '使用地点')?.zuobiao || '',
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

      const introItems: ActivityIntroItem[] = [
        { title: '使用说明', content: values.usage_note || '', showonlist: 'true' },
        { title: '使用地点', content: values.usage_address || '', zuobiao: values.usage_coordinate || '', showonlist: 'true' },
      ];
      const intro = JSON.stringify(introItems);

      const detailDesc: TicketDetailDesc = {
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
          intro,
          detail_desc,
          is_virtual: true,
          is_listed: false,
          is_visible: values.is_visible ?? true,
          sort_order: values.sort_order ?? 0,
        });
        success('门票创建成功');
      } else {
        if (!event) return;
        await productApi.updateProduct(event.id, {
          title: values.title,
          sub_title: values.sub_title || undefined,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
          intro,
          detail_desc,
          is_visible: values.is_visible,
          sort_order: values.sort_order ?? undefined,
        });
        success('门票更新成功');
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
      title={isCreate ? '添加门票' : '编辑门票'}
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
        <Form.Item label="门票名称" name="title"
          rules={[{ required: true, message: '请输入门票名称' }, { max: 128, message: '最多128个字符' }]}>
          <Input placeholder="请输入门票名称" />
        </Form.Item>

        <Form.Item label="门票简介" name="sub_title"
          rules={[{ max: 256, message: '最多256个字符' }]}>
          <Input placeholder="请输入门票简介（选填）" />
        </Form.Item>

        <Form.Item label="所属分类" name="category_id"
          rules={[{ required: true, message: '请选择分类' }]}>
          <Select placeholder="请选择分类" options={categoryOptions.map((c) => ({ label: c.name, value: c.id }))} />
        </Form.Item>

        <Form.Item label="门票封面" name="cover_image"
          rules={[{ required: true, message: '请上传门票封面' }]}>
          <CropperImageUpload aspect={1} sizeHint="建议尺寸：400 × 400 像素" />
        </Form.Item>

        <Form.Item label="门票图片" name="carousel_images"
          rules={[{ required: true, message: '请上传门票图片' }]}>
          <MultiImageUpload cropAspect={800 / 400} cropSizeHint="建议尺寸：800 × 400 像素" />
        </Form.Item>

        <Form.Item label="使用说明" name="usage_note"
          rules={[{ required: true, message: '请输入使用说明' }, { max: 512, message: '最多512个字符' }]}>
          <Input placeholder="如：有效期等" />
        </Form.Item>

        <Form.Item label="使用地点" required>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="usage_address" noStyle
              rules={[{ required: true, message: '请输入使用地点' }]}>
              <Input placeholder="请输入地点" />
            </Form.Item>
            <Space>
              <Form.Item name="usage_coordinate" noStyle>
                <Input placeholder="请输入坐标" style={{ width: 300 }} />
              </Form.Item>
              <a href="https://lbs.qq.com/tool/getpoint/index.html" target="_blank" rel="noopener noreferrer">
                查询坐标
              </a>
            </Space>
          </Space>
        </Form.Item>

        <Form.Item label="门票介绍" name="detail"
          rules={[{ required: true, message: '请输入门票介绍' }]}>
          <RichTextEditor placeholder="请输入门票详细介绍" />
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

export default TicketEditModal;
