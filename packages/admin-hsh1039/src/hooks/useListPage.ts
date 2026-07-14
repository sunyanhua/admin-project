import { useState, useCallback, useEffect, useRef } from 'react';
import { App } from 'antd';

export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
}

export interface ListParams {
  start?: number;
  length?: number;
  [key: string]: any;
}

export interface UseListPageOptions<T> {
  fetchFn: (params: ListParams) => Promise<any>;
  defaultPageSize?: number;
  resetOnSearch?: boolean;
  formatResponse?: (res: any) => { list: T[]; count: number };
  dependencies?: any[];
}

export function useListPage<T>({
  fetchFn,
  defaultPageSize = 10,
  resetOnSearch = true,
  formatResponse,
  dependencies = [],
}: UseListPageOptions<T>) {
  const { notification } = App.useApp();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    current: 1,
    pageSize: defaultPageSize,
    total: 0,
  });
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const isFirstRender = useRef(true);
  const fetchDataRef = useRef<() => Promise<void>>();
  const prevSearchValuesRef = useRef<Record<string, any>>({});
  const prevPaginationRef = useRef<{ current: number; pageSize: number }>({ current: 1, pageSize: defaultPageSize });

  const fetchData = useCallback(async (overrideParams?: ListParams) => {
    setLoading(true);
    try {
      const params: ListParams = {
        // 新接口统一使用 page / page_size（兼容旧 start/length 调用方）
        page: pagination.current,
        page_size: pagination.pageSize,
        ...searchValues,
        ...overrideParams,
        // cleanup legacy keys
        start: undefined,
        length: undefined,
      };

      const response = await fetchFn(params);

      let list: T[] = [];
      let count = 0;

      if (formatResponse) {
        const formatted = formatResponse(response);
        list = formatted.list;
        count = formatted.count;
      } else {
        list = response?.list || response?.data || response || [];
        count = response?.total || response?.count || 0;
        if (!Array.isArray(list)) list = [];
      }

      setData(list);
      setPagination(prev => ({ ...prev, total: count }));
    } catch (error: any) {
      notification.error({ message: error?.response?.data?.message || error?.response?.data?.msg || error?.message || '获取数据失败', placement: 'top' });
      setData([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, pagination.current, pagination.pageSize, searchValues, formatResponse, ...dependencies]);

  fetchDataRef.current = fetchData;

  // Initial fetch on mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchDataRef.current?.();
    }
  }, []);

  // Watch for searchValues changes to trigger new fetches
  useEffect(() => {
    // Skip if first render (already handled above) or if searchValues haven't changed
    if (isFirstRender.current) return;
    if (JSON.stringify(prevSearchValuesRef.current) === JSON.stringify(searchValues)) return;

    prevSearchValuesRef.current = searchValues;
    fetchDataRef.current?.();
  }, [searchValues]);

  // Watch for pagination changes to trigger new fetches (skip first render)
  useEffect(() => {
    // Skip if first render (already handled above)
    if (isFirstRender.current) {
      prevPaginationRef.current = { current: pagination.current, pageSize: pagination.pageSize };
      return;
    }
    // Only trigger if pagination actually changed
    if (prevPaginationRef.current.current === pagination.current && prevPaginationRef.current.pageSize === pagination.pageSize) return;

    prevPaginationRef.current = { current: pagination.current, pageSize: pagination.pageSize };
    fetchDataRef.current?.();
  }, [pagination.current, pagination.pageSize]);

  const search = useCallback((values: Record<string, any>) => {
    setSearchValues(values);
    if (resetOnSearch) {
      setPagination(prev => ({ ...prev, current: 1 }));
    }
  }, [resetOnSearch]);

  const reset = useCallback(() => {
    setSearchValues({});
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const onPageChange = useCallback((page: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize,
    }));
  }, []);

  const refresh = useCallback(() => {
    fetchDataRef.current?.();
  }, []);

  const updateItem = useCallback((id: number | string, updates: Partial<T>) => {
    setData(prev => prev.map(item =>
      (item as any).id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeItem = useCallback((id: number | string) => {
    setData(prev => prev.filter(item => (item as any).id !== id));
    setPagination(prev => ({ ...prev, total: prev.total - 1 }));
  }, []);

  return {
    data,
    setData,
    loading,
    pagination,
    setPagination,
    searchValues,
    search,
    reset,
    onPageChange,
    refresh,
    updateItem,
    removeItem,
    fetchData,
  };
}
