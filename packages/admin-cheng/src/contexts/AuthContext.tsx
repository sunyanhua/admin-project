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

  /** 用已存储 token 调用后端轻量接口验证有效性（仅验证，不获取用户信息） */
  const verifyToken = async (): Promise<boolean> => {
    try {
      await authApi.getMyLogs({ size: 1 });
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

  // 检查登录状态：token 存在则后端验证，再回退到 localStorage 缓存
  const checkAuth = async () => {
    const token = getAccessToken();
    if (!token) {
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

    setIsLoading(true);
    const valid = await verifyToken();
    // verifyToken 在 401 时会自动清除用户状态；非 401 失败不丢登录态
    if (valid) {
      // token 有效 — 从缓存恢复用户（login 时已写入）
      const cached = localStorage.getItem(ADMIN_USER_KEY);
      if (cached) {
        try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
      }
    }
    setMenu([]);
    setPage([]);
    setIsLoading(false);
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
      : 7200;
    setTokens(accessToken, '', expiresIn);

    // 用登录用户名创建 user（JWT 为 protobuf 编码，前端无法解码 roles/root）
    const userData: User = { name: username, role: 0, rule: 0, root: false, roles: [] };
    setUser(userData);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));

    // 验证 token 有效性
    await verifyToken();
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
