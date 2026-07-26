import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { authApi } from '@/api/services/auth';
import { getAccessToken, setTokens, clearTokens, cancelRefreshScheduler, ADMIN_USER_KEY } from '@/api';

interface MenuItem {
  name: string;
  href?: string;
  hide?: boolean;
  node?: MenuItem[];
  left?: MenuItem[];
}

interface PageItem {
  name: string;
  path: string;
  file: string;
  tool?: { name: string; icon: string; href: string }[];
}

interface User {
  id?: number;
  name: string;
  role: number;
  rule: number;
  root: boolean;
  roles: string[];
  login?: string;
  logip?: string;
}

interface AuthContextType {
  user: User | null;
  menu: MenuItem[];
  page: PageItem[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内使用');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [page, setPage] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFirstRender = useRef(true);

  const isAuthenticated = !!user;

  // 检查登录状态，绝不清除有效 token（仅 401 时失败）
  const checkAuth = async () => {
    const token = getAccessToken();
    if (!token) {
      // 无 token → 尝试从 localStorage 恢复用户
      const cached = localStorage.getItem(ADMIN_USER_KEY);
      if (cached) {
        try { setUser(JSON.parse(cached)); } catch { setUser(null); }
      } else {
        setUser(null);
      }
      setMenu([]);
      setPage([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response: any = await authApi.getLoginStatus();

      // 服务器可能在 checkAuth 时下发新 token
      if (response?.token) {
        setTokens(response.token, '', response.expires_in || 7200);
      }

      const admin = response?.admin;
      if (admin) {
        const roleList: string[] = admin.roles?.map((r: any) =>
          typeof r === 'string' ? r : r?.code
        ).filter(Boolean) || [];
        const userData: User = {
          id: admin.id,
          name: admin.real_name || admin.username,
          role: 0,
          rule: 0,
          root: roleList.includes('super_admin'),
          roles: roleList,
        };
        setUser(userData);
        setMenu(response?.menu || []);
        setPage(response?.page || []);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
      } else if (response?.user) {
        setUser(response.user);
        setMenu(response.menu || []);
        setPage(response.page || []);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(response.user));
      } else {
        // 响应无预期字段 → 降级用 localStorage 缓存，不清空用户
        const cached = localStorage.getItem(ADMIN_USER_KEY);
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      // 仅 401 时才清除 token（真正的过期）
      if (err?.response?.status === 401) {
        clearTokens();
        localStorage.removeItem(ADMIN_USER_KEY);
        setUser(null);
        setMenu([]);
        setPage([]);
        return;
      }
      // 网络瞬时错误 → 从 localStorage 恢复，不丢登录态
      const cached = localStorage.getItem(ADMIN_USER_KEY);
      if (cached) {
        try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 登录
  // POST /admin/v1/login → { token, expires_in, admin: { id, username, real_name, roles, must_change_password } }
  const login = async (username: string, password: string) => {
    const loginRes: any = await authApi.login({ username, password });

    const accessToken = loginRes?.token;
    if (!accessToken) {
      throw new Error('登录失败：服务器未返回访问令牌');
    }

    // 存储 token 并记录过期时间（支持主动续期）
    setTokens(accessToken, '', loginRes?.expires_in || 7200);

    // 将服务端 admin 对象映射到前端 User 结构
    if (!loginRes?.admin) {
      throw new Error('登录失败：无法获取管理员信息');
    }

    const { admin } = loginRes;
    const roleList: string[] = admin.roles?.map((r: any) =>
      typeof r === 'string' ? r : r?.code
    ).filter(Boolean) || [];
    const userData: User = {
      id: admin.id,
      name: admin.real_name || admin.username,
      role: 0,
      rule: 0,
      root: roleList.includes('super_admin'),
      roles: roleList,
    };

    setUser(userData);
    setMenu([]);
    setPage([]);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
  };

  // 登出
  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      cancelRefreshScheduler();
      clearTokens();
      localStorage.removeItem(ADMIN_USER_KEY);
      setUser(null);
      setMenu([]);
      setPage([]);
    }
  };

  // 监听storage变化（多标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ADMIN_USER_KEY) {
        if (e.newValue) {
          setUser(JSON.parse(e.newValue));
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 初始化时检查登录状态
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      checkAuth();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, menu, page, isAuthenticated, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
