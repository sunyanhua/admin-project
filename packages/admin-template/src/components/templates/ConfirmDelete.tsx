import { Modal, message } from 'antd';

export interface ConfirmDeleteOptions {
  name: string;
  deleteFn: () => Promise<any>;
  onSuccess?: () => void;
  title?: string;
  content?: string;
  okText?: string;
  cancelText?: string;
}

export const confirmDelete = (options: ConfirmDeleteOptions) => {
  Modal.confirm({
    title: options.title || '确认删除',
    content: options.content || `确定要删除 "${options.name}" 吗？此操作不可恢复。`,
    okText: options.okText || '删除',
    cancelText: options.cancelText || '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await options.deleteFn();
        message.success('删除成功');
        options.onSuccess?.();
      } catch (err: any) {
        message.error(err?.response?.data?.msg || err?.message || '删除失败');
        throw err;
      }
    },
  });
};

export interface ConfirmBatchDeleteOptions {
  count: number;
  deleteFn: () => Promise<any>;
  onSuccess?: () => void;
  title?: string;
  okText?: string;
  cancelText?: string;
}

export const confirmBatchDelete = (options: ConfirmBatchDeleteOptions) => {
  Modal.confirm({
    title: options.title || '确认删除',
    content: `确定要删除选中的 ${options.count} 项吗？此操作不可恢复。`,
    okText: options.okText || '删除',
    cancelText: options.cancelText || '取消',
    okType: 'danger',
    onOk: async () => {
      try {
        await options.deleteFn();
        message.success('删除成功');
        options.onSuccess?.();
      } catch (err: any) {
        message.error(err?.response?.data?.msg || err?.message || '删除失败');
        throw err;
      }
    },
  });
};
