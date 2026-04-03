const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

class AuthAPI {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      document.cookie = `token=${token}; path=/; samesite=lax`;
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async register(email: string, password: string, role: 'mentor' | 'student', name?: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role, name }),
    });

    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    const data = await this.request('/api/auth/me');
    return data.user || null;
  }

  logout() {
    this.clearToken();
  }
}

export const authAPI = new AuthAPI();

// For backward compatibility, export a mock supabase object
export const supabase = {
  auth: {
    signUp: async (data: any) => {
      try {
        const result = await authAPI.register(data.email, data.password, 'student'); // Default to student
        return { data: { user: result.user }, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
    signInWithPassword: async (data: any) => {
      try {
        const result = await authAPI.login(data.email, data.password);
        return { data: { user: result.user }, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
    getSession: async () => {
      try {
        const result = await authAPI.getCurrentUser();
        return { data: { session: { access_token: authAPI.getToken() } }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    onAuthStateChange: (callback: any) => {
      // Mock implementation - in a real app you'd use a more sophisticated approach
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signOut: async () => {
      authAPI.logout();
      return { error: null };
    }
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => {
          // Mock implementation for profiles
          if (table === 'profiles') {
            try {
              const result = await authAPI.getCurrentUser();
              return { data: { role: result.user.role }, error: null };
            } catch {
              return { data: null, error: { message: 'Not authenticated' } };
            }
          }
        }
      })
    }),
    insert: () => ({
      // Mock implementation
      select: () => ({ data: null, error: null })
    })
  })
};