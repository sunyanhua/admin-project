import React from 'react';
import { Modal } from 'antd';
import type { ModalProps } from 'antd';
import './ScrollableModal.css';

/**
 * 全站统一标准弹窗组件
 *
 * 布局规范：
 * 1. 标题栏 — antd Modal 原生 header，样式不变
 * 2. body padding 统一为 10px 0
 * 3. 可选 header 区 — 如 Steps 步骤条（margin-bottom: 15px，无边线）
 * 4. 滚动内容区 — padding: 16px（四周），上下边线
 * 5. 可选 footer 区 — 置底不参与滚动，无边线，padding: 12px 24px
 *
 * 用法：
 *   <ScrollableModal title="标题" open={v} onCancel={close}>
 *     <Form>...</Form>
 *   </ScrollableModal>
 *
 *   带 header：
 *   <ScrollableModal title="标题" open={v} onCancel={close}
 *     header={<Steps ... />}
 *     footer={<Button>保存</Button>}>
 *     <Form>...</Form>
 *   </ScrollableModal>
 */
export interface ScrollableModalProps extends Omit<ModalProps, 'footer'> {
  /** 固定在滚动区上方的头部内容（如 Steps 步骤条），可选 */
  header?: React.ReactNode;
  /** 固定在底部的操作按钮区（可选） */
  footer?: React.ReactNode;
}

const ScrollableModal: React.FC<ScrollableModalProps> = ({
  children,
  header,
  footer,
  className,
  width,
  ...modalProps
}) => {
  return (
    <Modal
      {...modalProps}
      width={width}
      footer={null}
      maskClosable={false}
      className={`scrollable-modal${className ? ` ${className}` : ''}`}
    >
      <div className="sm-container">
        {header && <div className="sm-header">{header}</div>}
        <div className="sm-body">{children}</div>
        {footer !== undefined && <div className="sm-footer">{footer}</div>}
      </div>
    </Modal>
  );
};

export default ScrollableModal;
