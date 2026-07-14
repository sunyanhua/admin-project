import { App } from 'antd';

export const useAppNotification = () => {
  const { notification } = App.useApp();
  return {
    success: (message: string) => notification.success({ message, placement: 'top' }),
    error: (message: string) => notification.error({ message, placement: 'top' }),
    warning: (message: string) => notification.warning({ message, placement: 'top' }),
    info: (message: string) => notification.info({ message, placement: 'top' }),
  };
};
