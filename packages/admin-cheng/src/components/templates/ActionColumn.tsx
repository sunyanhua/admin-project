import { Button, Space } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, StopOutlined, CheckOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface ActionColumnProps {
  onView?: (record: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onStatusChange?: (record: any, newStatus: boolean) => void;
  statusKey?: string;
  enabledValue?: any;
  disabledValue?: any;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showStatus?: boolean;
  render?: (record: any) => React.ReactNode;
  disabled?: boolean;
  dangerDelete?: boolean;
  width?: number;
  viewText?: string;
}

export const ActionColumn = ({
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  statusKey = 'status',
  enabledValue = 0,
  disabledValue = 1,
  showView = false,
  showEdit = true,
  showDelete = true,
  showStatus = false,
  render,
  disabled = false,
  dangerDelete = true,
  width,
  viewText = '查看',
}: ActionColumnProps): ColumnsType<any>[number] => ({
  title: '操作',
  key: 'action',
  width: width ?? (showStatus ? 240 : showView ? 180 : 160),
  fixed: 'right' as const,
  render: (_: any, record: any) => {
    if (render) {
      return <Space size="small" className="action-buttons">{render(record)}</Space>;
    }

    const currentStatus = record[statusKey];
    const isEnabled = currentStatus === enabledValue;

    return (
      <Space size="small" className="action-buttons">
        {showView && onView && (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onView(record)}>
            {viewText}
          </Button>
        )}
        {showEdit && onEdit && (
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            编辑
          </Button>
        )}
        {showDelete && onDelete && (
          <Button
            type="link"
            size="small"
            danger={dangerDelete}
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record)}
          >
            删除
          </Button>
        )}
        {showStatus && onStatusChange && (
          <Button
            type="link"
            size="small"
            icon={isEnabled ? <StopOutlined /> : <CheckOutlined />}
            onClick={() => onStatusChange(record, !isEnabled)}
          >
            {isEnabled ? '禁用' : '启用'}
          </Button>
        )}
      </Space>
    );
  },
});
