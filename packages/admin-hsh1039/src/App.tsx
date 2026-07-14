import { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import AppRouter from './router'
import { setMessageHandlers } from './utils/message'
import { setGlobalErrorHandler } from './api'
import { setConfirmHandlers } from './components/templates/ConfirmDelete'
import './App.css'
import './styles/iconfont.css'

function App() {
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
            <MessageBootstrap />
            <AppRouter />
          </AppProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  )
}

/** 注入全局消息处理，统一使用 notification（与页面 useAppNotification 样式一致） */
function MessageBootstrap() {
  const { notification } = AntApp.useApp();
  useEffect(() => {
    const s = (msg: string) => notification.success({ message: msg, placement: 'top' });
    const e = (msg: string) => notification.error({ message: msg, placement: 'top' });
    const w = (msg: string) => notification.warning({ message: msg, placement: 'top' });
    setMessageHandlers(s, e, w, w);
    setGlobalErrorHandler(e);
    setConfirmHandlers(s, e);
  }, [notification]);
  return null;
}

export default App
