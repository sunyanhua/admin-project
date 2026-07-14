import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import AppRouter from './router'
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
            <AppRouter />
          </AppProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  )
}

export default App