import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, InputNumber } from 'antd';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import ScrollableModal from '@/components/templates/ScrollableModal';

const { TextArea } = Input;

// 券码默认图标（与抽奖管理中券码类型的默认图标一致）
const DEFAULT_VOUCHER_ICON = 'https://tlnc-cdn.vbegin.com.cn/upload/prod/1/20260810/019febec-e12a-75b5-bcf4-0f553752f230.png';

export interface VoucherLibraryItem {
  name: string;
  icon: string;
  description: string;
  total_count: number;
  used_count: number;
  codes: string[];
}

interface VoucherLibraryModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  library: VoucherLibraryItem | null;
  onClose: () => void;
  onSuccess: (item: VoucherLibraryItem, mode: 'create' | 'edit') => void;
}

const VoucherLibraryModal: React.FC<VoucherLibraryModalProps> = ({ visible, mode, library, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (visible && mode === 'create') {
      form.resetFields();
      form.setFieldsValue({ icon: DEFAULT_VOUCHER_ICON });
      setNewCount(0);
    } else if (visible && mode === 'edit' && library) {
      setTimeout(() => {
        form.setFieldsValue({
          name: library.name,
          icon: library.icon || '',
          description: library.description || '',
          existing_codes: library.codes.join('\n'),
          new_codes: '',
        });
        setNewCount(0);
      }, 50);
    }
  }, [visible, mode, library, form]);

  const handleNewCodesChange = (value: string) => {
    const lines = value.split('\n').filter(s => s.trim());
    setNewCount(lines.length);
  };

  const handleFinish = async (values: any) => {
    if (mode === 'create') {
      const codes: string[] = values.voucher_codes
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);
      onSuccess({
        name: values.name,
        icon: values.icon || '',
        description: values.description || '',
        total_count: codes.length,
        used_count: 0,
        codes,
      }, 'create');
    } else if (library) {
      const existingCodes = library.codes;
      const newCodes: string[] = values.new_codes
        ? values.new_codes.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : [];
      const allCodes = [...existingCodes, ...newCodes];
      onSuccess({
        ...library,
        name: values.name,
        icon: values.icon || '',
        description: values.description || '',
        total_count: allCodes.length,
        codes: allCodes,
      }, 'edit');
    }
    onClose();
  };

  const isCreate = mode === 'create';

  return (
    <ScrollableModal
      title={isCreate ? '新增券码库' : '编辑券码库'}
      open={visible}
      onCancel={onClose}
      width={560}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={() => form.submit()}>确认{isCreate ? '添加' : '保存'}</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} autoComplete="off"
        scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
        initialValues={isCreate ? { icon: DEFAULT_VOUCHER_ICON } : undefined}
      >
        <Form.Item label="券码库名称" name="name" rules={[{ required: true, message: '请输入券码库名称' }, { max: 64, message: '最多64个字符' }]}>
          <Input placeholder="如：星巴克礼品卡" maxLength={64} showCount />
        </Form.Item>

        <Form.Item label="券码说明" name="description">
          <TextArea placeholder="请输入券码使用说明" rows={3} maxLength={512} showCount />
        </Form.Item>

        <Form.Item label="券码库图标" name="icon" extra="建议尺寸：200 × 200 像素">
          <CropperImageUpload aspect={1} sizeHint="建议尺寸：200 × 200 像素" />
        </Form.Item>

        {isCreate ? (
          <Form.Item label="券码" name="voucher_codes"
            rules={[{ required: true, message: '请输入券码' }]}
            extra={`每行一个券码，当前已输入数量：${newCount}`}
          >
            <TextArea rows={10} placeholder={"每行一个券码\n如：\nABC123\nDEF456\nGHI789"}
              onChange={e => handleNewCodesChange(e.target.value)}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item label="原有券码" name="existing_codes" extra="原有券码不可编辑">
              <TextArea rows={6} disabled style={{ color: '#999' }} />
            </Form.Item>

            <Form.Item label="追加券码" name="new_codes"
              extra={
                <span>
                  每行一个券码，当前新输入数量：{newCount}
                  {library ? <span style={{ marginLeft: 8 }}>（追加后总数为 {library.codes.length + newCount}）</span> : null}
                </span>
              }
            >
              <TextArea rows={6} placeholder={"每行一个券码\n如：\nXYZ001\nXYZ002"}
                onChange={e => handleNewCodesChange(e.target.value)}
              />
            </Form.Item>
          </>
        )}

        <Form.Item label="预计总数" style={{ marginBottom: 0 }}>
          <InputNumber
            value={isCreate ? newCount : ((library?.codes.length ?? 0) + newCount)}
            disabled style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default VoucherLibraryModal;
