import '@testing-library/jest-dom/vitest'

// 修复 AbortSignal 相关错误
if (typeof globalThis.AbortSignal === 'undefined') {
  class MockAbortSignal {
    aborted = false
    reason = undefined
    onabort = null
    throwIfAborted() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return false }
  }
  globalThis.AbortSignal = MockAbortSignal as any
  globalThis.AbortController = class MockAbortController {
    signal = new MockAbortSignal()
    abort() {}
  }
}

// 可以在这里添加全局测试配置
// 例如：配置测试前后要执行的代码