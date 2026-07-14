import { Modal } from 'antd';

// 由 App.tsx 注入的全局消息方法（避免 antd 静态方法警告）
let _showSuccess: ((msg: string) => void) | null = null;
let _showError: ((msg: string) => void) | null = null;

export function setConfirmHandlers(showSuccess: (msg: string) => void, showError: (msg: string) => void) {
  _showSuccess = showSuccess;
  _showError = showError;
}

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
        _showSuccess?.('删除成功');
        options.onSuccess?.();
      } catch (err: any) {
        _showError?.(err?.response?.data?.message || err?.response?.data?.msg || err?.message || '删除失败');
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
        _showSuccess?.('删除成功');
        options.onSuccess?.();
      } catch (err: any) {
        _showError?.(err?.response?.data?.message || err?.response?.data?.msg || err?.message || '删除失败');
        throw err;
      }
    },
  });
};
