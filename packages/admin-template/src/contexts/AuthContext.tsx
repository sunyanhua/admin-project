import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { authApi } from '@/api/services/auth';

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
  login?: string;
  logip?: string;
}

interface LoginData {
  user: User;
  menu: MenuItem[];
  page: PageItem[];
}

interface AuthContextType {
  user: User | null;
  menu: MenuItem[];
  page: PageItem[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (name: string, pass: string) => Promise<void>;
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

  // 检查登录状态
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response: any = await authApi.getLoginStatus();

      // 处理不同的响应格式
      let userData = null;
      let menuData = [];
      let pageData = [];

      if (response?.user) {
        userData = response.user;
        menuData = response.menu || [];
        pageData = response.page || [];
      } else if (response?.data?.user) {
        // 嵌套格式
        userData = response.data.user;
        menuData = response.data.menu || [];
        pageData = response.data.page || [];
      }

      if (userData) {
        setUser(userData);
        setMenu(menuData);
        setPage(pageData);
        localStorage.setItem('admin_user', JSON.stringify(userData));
      } else {
        // 未登录
        setUser(null);
        setMenu([]);
        setPage([]);
      }
    } catch (error) {
      setUser(null);
      setMenu([]);
      setPage([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 登录
  const login = async (name: string, pass: string) => {
    const response: any = await authApi.login({ name, pass });

    // 处理不同的响应格式
    let userData = null;
    let menuData = [];
    let pageData = [];

    if (response?.user) {
      userData = response.user;
      menuData = response.menu || [];
      pageData = response.page || [];
    } else if (response?.data?.user) {
      // 嵌套格式
      userData = response.data.user;
      menuData = response.data.menu || [];
      pageData = response.data.page || [];
    }

    if (!userData) {
      throw new Error('登录响应格式错误');
    }

    // 保存登录信息
    setUser(userData);
    setMenu(menuData);
    setPage(pageData);
    localStorage.setItem('admin_user', JSON.stringify(userData));
  };

  // 登出
  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // 清除本地登录信息
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
      // 只从服务器获取登录状态，避免 localStorage 旧数据造成闪烁
      checkAuth();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, menu, page, isAuthenticated, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
