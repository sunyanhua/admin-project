/**
 * 全局消息工具
 * 绕过 antd v5 静态方法无法消费 Context 的警告
 * 在 App.tsx 中通过 setMessageHandlers 注入 App.useApp().message 实例
 */
type MsgFn = (content: string) => void;

let _success: MsgFn = console.log;
let _error: MsgFn = console.error;
let _warning: MsgFn = console.warn;
let _info: MsgFn = console.info;

export function setMessageHandlers(s: MsgFn, e: MsgFn, w?: MsgFn, i?: MsgFn) {
  _success = s;
  _error = e;
  if (w) _warning = w;
  if (i) _info = i;
}

export const globalMessage = {
  success: (content: string) => _success(content),
  error: (content: string) => _error(content),
  warning: (content: string) => _warning(content),
  info: (content: string) => _info(content),
};
