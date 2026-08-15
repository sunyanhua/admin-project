import request from '..';

// ========================
// 奖池（Pool）
// ========================

export interface Pool {
  id: string;
  name: string;
  pool_type: number; // 1=积分抽 2=活动抽
  description?: string;
  icon?: string;
  image?: string;
  start_time?: string;
  end_time?: string;
  status: number; // 0=启用 1=禁用
  win_count?: number;   // 中奖人数（列表直接返回）
  draw_count?: number;  // 抽奖次数
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePoolRequest {
  name: string;
  pool_type?: number;
  description?: string;
  icon?: string;
  image?: string;
  start_time?: string;
  end_time?: string;
}

export interface UpdatePoolRequest {
  name?: string;
  pool_type?: number;
  description?: string;
  icon?: string;
  image?: string;
  start_time?: string;
  end_time?: string;
}

// ========================
// 奖品（Prize）
// ========================

export interface Prize {
  id: string;
  pool_id: string;
  name: string;
  prize_type: number; // 1=实物 2=券码 3=金币
  amount: number;
  description?: string;
  icon?: string;
  image?: string;
  total_count: number;
  used_count: number;
  start_time?: string;
  end_time?: string;
  status: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePrizeRequest {
  name: string;
  prize_type: number;
  amount?: number;
  description?: string;
  icon?: string;
  image?: string;
  total_count?: number;
  start_time?: string;
  end_time?: string;
}

export interface UpdatePrizeRequest {
  name?: string;
  prize_type?: number;
  amount?: number;
  description?: string;
  icon?: string;
  image?: string;
  start_time?: string;
  end_time?: string;
}

// ========================
// 投放 & 中奖记录
// ========================

export interface DeployRequest {
  total_count: number;
  voucher_codes?: string[];
  start_time?: string;
  end_time?: string;
}

export interface Batch {
  id: string;
  pool_id: string;
  prize_id: string;
  status: number;
  total_count: number;
  processed_count: number;
  created_by?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPrize {
  id: string;
  user_id: string;
  pool_id: string;
  prize_id: string;
  prize_type: number;
  prize_name?: string;
  amount: number;
  ship_status?: number | null;
  carrier?: string;
  tracking_number?: string;
  shipped_at?: string;
  status: number;
  won_at?: string;
  created_at?: string;
  updated_at?: string;
  user_data?: {
    phone?: string;
    credits?: number;
    is_activated?: boolean;
  };
  user_profile?: {
    nickname?: string;
    avatar?: string;
    gender?: number;
    age?: number;
  };
  user_match_profile?: {
    real_name?: string;
  };
}

export const lotteryApi = {
  // === 奖池 ===
  getPools: (params?: { status?: number; keyword?: string; page?: number; size?: number }) => {
    return request.get('/admin/v1/bizops/lottery/pool', { params });
  },
  getPoolDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/lottery/pool/${id}`);
  },
  createPool: (data: CreatePoolRequest) => {
    return request.post('/admin/v1/bizops/lottery/pool', data);
  },
  updatePool: (id: string, data: UpdatePoolRequest) => {
    return request.put(`/admin/v1/bizops/lottery/pool/${id}`, data);
  },
  togglePoolStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/bizops/lottery/pool/${id}/status`, { status });
  },
  deletePool: (id: string) => {
    return request.delete(`/admin/v1/bizops/lottery/pool/${id}`);
  },

  // === 奖品 ===
  getPrizes: (poolId: string, params?: { status?: number; keyword?: string; page?: number; size?: number }) => {
    return request.get(`/admin/v1/bizops/lottery/pool/${poolId}/prize`, { params });
  },
  getPrizeDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/lottery/prize/${id}`);
  },
  createPrize: (poolId: string, data: CreatePrizeRequest) => {
    return request.post(`/admin/v1/bizops/lottery/pool/${poolId}/prize`, data);
  },
  updatePrize: (id: string, data: UpdatePrizeRequest) => {
    return request.put(`/admin/v1/bizops/lottery/prize/${id}`, data);
  },
  togglePrizeStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/bizops/lottery/prize/${id}/status`, { status });
  },
  deletePrize: (id: string) => {
    return request.delete(`/admin/v1/bizops/lottery/prize/${id}`);
  },
  deployPrize: (id: string, data: DeployRequest) => {
    return request.post(`/admin/v1/bizops/lottery/prize/${id}/deploy`, data);
  },

  // === 投放批次 ===
  getDeployBatches: (params?: { status?: number; keyword?: string; page?: number; size?: number }) => {
    return request.get('/admin/v1/bizops/lottery/deployment/batch', { params });
  },

  // === 中奖记录 ===
  getUserPrizes: (params?: { status?: number; keyword?: string; page?: number; size?: number; pool_id?: string; prize_type?: number }) => {
    return request.get('/admin/v1/bizops/lottery/user-prize', { params });
  },
  shipUserPrize: (id: string, data: { ship_status: number; carrier?: string; tracking_number?: string }) => {
    return request.put(`/admin/v1/bizops/lottery/user-prize/${id}/ship`, data);
  },
};
