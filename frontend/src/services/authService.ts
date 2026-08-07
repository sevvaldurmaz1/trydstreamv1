import apiClient, { clearStoredTokens, setStoredTokens } from './api';
import type { ApiResponse, AuthTokens, LoginRequest, RegisterRequest, User } from '../types';

// ─────────────────────────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────────────────────────

export const authService = {
  async login(credentials: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const res = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
      '/auth/login',
      credentials,
    );
    const { user, tokens } = res.data.data;
    setStoredTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return { user, tokens };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearStoredTokens();
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken });
    return res.data.data;
  },

  async getProfile(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data.data;
  },

  async register(data: RegisterRequest): Promise<User> {
    const res = await apiClient.post<ApiResponse<User>>('/auth/register', data);
    return res.data.data;
  },
};
