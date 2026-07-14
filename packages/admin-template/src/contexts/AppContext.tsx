import { createContext, useContext, useState, ReactNode } from 'react';

interface AppState {
  loading: boolean;
  collapsed: boolean;
}

interface AppContextType {
  state: AppState;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp必须在AppProvider内使用');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [state, setState] = useState<AppState>({
    loading: false,
    collapsed: false,
  });

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, collapsed: !prev.collapsed }));
  };

  return (
    <AppContext.Provider value={{ state, setLoading, toggleSidebar }}>
      {children}
    </AppContext.Provider>
  );
};