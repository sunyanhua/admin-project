import request from '..';

export interface City {
  id: string;
  adcode: string;
  title: string;
  status?: number;
  visible?: boolean;
  arg_0?: string;
}

export interface CityListParams {
  start?: number;
  length?: number;
  keyword?: string;
}

export interface CityListResponse {
  start: number;
  length: number;
  word: string | null;
  count: number;
  data: City[];
}

export const cityApi = {
  // 获取城市列表
  getCities: async (params?: CityListParams): Promise<CityListResponse> => {
    const data = await request.get('/admin/v6/city', { params });
    return data as unknown as CityListResponse;
  },

  // 获取城市详情
  getCityDetail: async (adcode: string): Promise<City> => {
    const data = await request.get(`/admin/v6/city/${adcode}`);
    return data as unknown as City;
  },

  // 创建城市
  createCity: async (data: Partial<City>): Promise<City> => {
    const response = await request.post('/admin/v6/city', data);
    return response as unknown as City;
  },

  // 更新城市
  updateCity: async (adcode: string, data: Partial<City>): Promise<City> => {
    const response = await request.post(`/admin/v6/city/${adcode}`, data);
    return response as unknown as City;
  },

  // 删除城市
  deleteCity: async (adcode: string): Promise<string> => {
    const response = await request.post('/admin/v6/city/delete', { adcode });
    return response as unknown as string;
  },

  // 更新状态
  updateStatus: async (adcode: string, status: number): Promise<void> => {
    await request.post('/admin/v6/city/status', { adcode, status });
  },

  // 更新可见性
  updateVisible: async (adcode: string, visible: boolean): Promise<void> => {
    await request.post('/admin/v6/city/visible', { adcode, visible });
  },
};
