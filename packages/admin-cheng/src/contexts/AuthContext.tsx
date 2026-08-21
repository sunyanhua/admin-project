import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { authApi } from '@/api/services/auth';
import { getAccessToken, setTokens, clearTokens, cancelReloginScheduler, scheduleRelogin, storeCredentials, clearCredentials, ADMIN_USER_KEY } from '@/api';

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
  id: string;
  username: string;
  name: string;
  realName: string;
  email: string;
  phone: string;
  isRoot: boolean;
  roles: { id: string; name: string; description: string }[];
  permissions: string[];
  status: number;
  needChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
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

  /** 调用 /admin/v1/login/profile 获取当前管理员完整信息 */
  const fetchProfile = async (): Promise<boolean> => {
    try {
      const profile = await authApi.getProfile();
      const userData: User = {
        id: profile.id,
        username: profile.username,
        name: profile.real_name || profile.username,
        realName: profile.real_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        isRoot: profile.is_root,
        roles: profile.roles || [],
        permissions: profile.permissions || [],
        status: profile.status,
        needChangePassword: profile.need_change_password,
        createdAt: profile.created_at || '',
        updatedAt: profile.updated_at || '',
      };
      setUser(userData);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
      return true;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearTokens();
        localStorage.removeItem(ADMIN_USER_KEY);
        setUser(null);
      }
      return false;
    }
  };

  // 检查登录状态：token 存在则调 profile 验证并获取用户信息
  const checkAuth = async () => {
    const token = getAccessToken();
    if (!token) {
      localStorage.removeItem(ADMIN_USER_KEY);
      setUser(null);
      setMenu([]);
      setPage([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await fetchProfile();
    } catch {
      // fetchProfile 已自行处理 401，此处兜底防止 isLoading 永远卡住
      setUser(null);
    } finally {
      setMenu([]);
      setPage([]);
      setIsLoading(false);
    }
  };

  // 登录
  // POST /admin/v1/login → { access_token, token_type, issued_at, expires_at }
  const login = async (username: string, password: string) => {
    const loginRes: any = await authApi.login({ username, password });

    const accessToken = loginRes?.access_token;
    if (!accessToken) {
      throw new Error('登录失败：服务器未返回访问令牌');
    }

    // Swagger 返回 expires_at（Unix 时间戳），setTokens 需要 duration 秒数
    const expiresIn = loginRes?.expires_at
      ? Math.max(0, loginRes.expires_at - Math.floor(Date.now() / 1000))
      : 43200;
    setTokens(accessToken, '', expiresIn);
    // 登录后立即启动到期前主动续期定时器（否则只能等请求 401 被动重登，容易跳登录页）
    scheduleRelogin();
    storeCredentials(username, password);

    // 调用 profile 获取管理员完整信息
    await fetchProfile();
  };

  // 登出
  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      cancelReloginScheduler();
      clearTokens();
      clearCredentials();
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
