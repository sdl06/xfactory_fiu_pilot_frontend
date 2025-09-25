import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  business_type?: string;
  idea_summary?: string;
  progress?: {
    sections_completed: string[];
    current_section: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  setAuthData: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing token on app load - simplified version
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('userData');
      
      console.log('AuthContext init - Token:', storedToken ? 'EXISTS' : 'NONE');
      console.log('AuthContext init - User:', storedUser ? 'EXISTS' : 'NONE');
      
      if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          console.log('AuthContext init - User loaded:', parsedUser.email);
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          // Clear invalid data
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('isAdmin');
        }
      }
    } catch (e) {
      console.error('AuthContext init error:', e);
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.login(email, password);

      if (response.data && response.data.token) {
        console.log('Setting auth data...');
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        
        // Set admin flag if present
        if (response.data.is_admin) {
          localStorage.setItem('isAdmin', 'true');
        }
        
        console.log('Login successful for:', response.data.user.email);
        
        toast({
          title: "Success",
          description: "Login successful!",
        });
        
        return true;
      } else {
        console.error('Login failed - no token in response');
        toast({
          title: "Login Failed",
          description: response.error || "Invalid credentials",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('isAdmin');
    // Clear app-specific scoped keys to avoid cross-team leakage
    try {
      const keys = Object.keys(localStorage);
      const prefixes = [
        'xfactory', // app data
        'factorai_', // assistant
      ];
      keys.forEach((k) => {
        if (prefixes.some(p => k.startsWith(p))) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
    
    // Call logout endpoint
    if (token) {
      apiClient.logout().catch(console.error);
    }
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const checkAuth = async (): Promise<boolean> => {
    if (!token) return false;
    
    try {
      const response = await apiClient.getProfile();

      if (response.data) {
        setUser(response.data.user);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        return true;
      } else {
        // Token is invalid, clear auth state
        logout();
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    }
  };

  const setAuthData = (token: string, user: User) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    checkAuth,
    updateUser,
    setAuthData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 