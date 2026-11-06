import '@testing-library/jest-dom/vitest'

// Node 25 实验性 localStorage（--localstorage-file 缺失时方法不可用）会遮蔽 jsdom 实现，
// 导致模块顶层读取 localStorage 时崩溃；此处兜底替换为内存实现
try {
  if (typeof localStorage.getItem !== 'function') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => { store.clear(); },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    } as Storage;
  }
} catch { /* localStorage 不可访问时保持原样 */ }

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