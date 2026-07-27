/** 分页响应泛型 — Swagger PagedResponse */
export interface PagedResponse<T> {
  code: number;
  message: string;
  data: T;
  pagination: Pagination;
}

/** 分页信息 — Swagger Pagination */
export interface Pagination {
  /** 当前页码（1-based） */
  page: number;
  /** 每页条数 */
  size: number;
  /** 总记录数 */
  total: number;
  /** 是否还有更多页 */
  has_more: boolean;
}

/** 非分页响应泛型 — Swagger Response */
export interface Response<T = unknown> {
  code: number;
  message: string;
  data: T;
}
