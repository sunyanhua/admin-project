import { Modal, Descriptions } from 'antd';
import { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value?: ReactNode;
  span?: number;
  render?: (value: any, record: any) => ReactNode;
}

export interface DetailSection {
  title?: ReactNode;
  items: DetailItem[];
}

export interface DetailModalProps {
  title?: string;
  open: boolean;
  onClose: () => void;
  entity?: any;
  sections?: DetailSection[];
  render?: (entity: any) => { sections: DetailSection[] } | null;
  children?: (entity: any) => { sections: DetailSection[] } | null;
  width?: number;
  className?: string;
  footer?: ReactNode;
  confirmLoading?: boolean;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  title = '详情',
  open,
  onClose,
  entity,
  sections: sectionsProp,
  render,
  width = 700,
  className,
  footer,
  confirmLoading,
  children,
}) => {
  const sections = (render && entity) ? render(entity)?.sections :
    (typeof children === 'function' && entity) ? children(entity)?.sections : sectionsProp;

  if (!sections || sections.length === 0) {
    return (
      <Modal
        title={title}
        open={open}
        onCancel={onClose}
        footer={footer}
        width={width}
        className={className}
        destroyOnHidden
        confirmLoading={confirmLoading}
      >
        {entity ? null : <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无数据</div>}
      </Modal>
    );
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={footer}
      width={width}
      className={className}
      destroyOnHidden
      confirmLoading={confirmLoading}
    >
      {sections.map((section, idx) => (
        <Descriptions
          key={idx}
          column={2}
          bordered
          size="small"
          title={section.title}
          style={{ marginBottom: idx < sections.length - 1 ? 16 : 0 }}
        >
          {section.items.map((item, itemIdx) => (
            <Descriptions.Item
              key={itemIdx}
              label={item.label}
              span={item.span}
            >
              {item.render
                ? item.render(item.value, entity)
                : item.value !== undefined
                  ? item.value
                  : '-'}
            </Descriptions.Item>
          ))}
        </Descriptions>
      ))}
    </Modal>
  );
};
