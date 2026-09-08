import { useCallback } from 'react';
import { App } from 'antd';

/**
 * 统一消息提示（antd v5 Context 消费）。
 * 注意：函数用 useCallback 记忆化——否则每次渲染返回新引用，
 * 依赖数组包含 error 的 useEffect 会陷入「渲染→effect→请求→渲染」无限循环。
 */
export const useAppNotification = () => {
  const { notification } = App.useApp();
  return {
    success: useCallback((message: string) => notification.success({ message, placement: 'top' }), [notification]),
    error: useCallback((message: string) => notification.error({ message, placement: 'top' }), [notification]),
    warning: useCallback((message: string) => notification.warning({ message, placement: 'top' }), [notification]),
    info: useCallback((message: string) => notification.info({ message, placement: 'top' }), [notification]),
  };
};
