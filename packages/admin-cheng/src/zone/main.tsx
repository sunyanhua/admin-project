import React from 'react'
import ReactDOM from 'react-dom/client'
import ZoneApp from './App'
import 'antd/dist/reset.css'
import '@/index.css'
import 'dayjs/locale/zh-cn'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ZoneApp />
  </React.StrictMode>,
)
