import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    // 检查是否渲染了某些内容，例如路由组件
    // 由于App主要包含上下文提供者，我们至少可以检查document.body是否存在
    expect(document.body).toBeInTheDocument()
  })
})