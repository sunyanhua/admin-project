import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { authApi } from '@/api/services/auth';
import { getAccessToken, setTokens, clearTokens } from '@/api';

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

  // 检查登录状态（GET /admin/v1/login + Bearer Token）
  // 响应格式与登录一致: { token, admin: { id, username, real_name, roles } }
  const checkAuth = async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setMenu([]);
      setPage([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response: any = await authApi.getLoginStatus();

      // 优先从 admin 字段（新接口），兜底 user 字段（旧接口）
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
        localStorage.setItem('admin_user', JSON.stringify(userData));
      } else if (response?.user) {
        setUser(response.user);
        setMenu(response.menu || []);
        setPage(response.page || []);
        localStorage.setItem('admin_user', JSON.stringify(response.user));
      } else {
        setUser(null);
        setMenu([]);
        setPage([]);
      }
    } catch (err: any) {
      // 仅 401 时才清除 token（真正的过期），其他错误保留登录状态避免误登出
      if (err?.response?.status === 401) {
        clearTokens();
        localStorage.removeItem('admin_user');
        setUser(null);
        setMenu([]);
        setPage([]);
      }
      // 网络瞬时错误不处理，保持当前状态
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

    // 存储 token（拦截器后续请求会自动携带）
    setTokens(accessToken, '');

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
    localStorage.setItem('admin_user', JSON.stringify(userData));
  };

  // 登出
  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // 清除本地登录信息
      clearTokens();
      localStorage.removeItem('admin_user');
      setUser(null);
      setMenu([]);
      setPage([]);
    }
  };

  // 监听storage变化（多标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_user') {
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
