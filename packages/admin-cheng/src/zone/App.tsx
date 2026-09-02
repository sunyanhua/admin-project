import { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppProvider } from '@/contexts/AppContext'
import ZoneRouter from './router'
import { setGlobalErrorHandler } from '@/api'
import { setConfirmHandlers } from '@/components/templates/ConfirmDelete'
import '@/App.css'
import '@/styles/iconfont.css'

/**
 * 专区管理后台（独立入口 zone.html，与主后台共用认证上下文但存储键按
 * VITE_PROJECT_ID=cheng-zone 隔离）
 */
function ZoneApp() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          fontSize: 16,
          fontSizeLG: 18,
          fontSizeSM: 14,
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <AppProvider>
            <ZoneMessageBootstrap />
            <ZoneRouter />
          </AppProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  )
}

/** 注入全局消息处理（必须：confirmDelete / 拦截器错误提示依赖此注入） */
function ZoneMessageBootstrap() {
  const { notification } = AntApp.useApp();
  useEffect(() => {
    const s = (msg: string) => notification.success({ message: msg, placement: 'top' });
    const e = (msg: string) => notification.error({ message: msg, placement: 'top' });
    setGlobalErrorHandler(e);
    setConfirmHandlers(s, e);
  }, [notification]);
  return null;
}

export default ZoneApp
