import request from '..';

// 发票 API（v1 mall — Invoices-Admin 模块）
export const invoiceApi = {
  // 管理后台发票列表
  getInvoices: (params?: { page?: number; page_size?: number }) => {
    return request.get('/admin/v1/mall/invoices', { params });
  },
};
