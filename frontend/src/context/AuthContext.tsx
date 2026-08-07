import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { authService } from '../services/authService';
import { getStoredTokens } from '../services/api';
import type { AuthState, LoginRequest, User, JwtPayload } from '../types';

// ─────────────────────────────────────────────────────────────────
// Auth Context
// ─────────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; tokens: NonNullable<AuthState['tokens']> } }
  | { type: 'CLEAR_AUTH' };

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'CLEAR_AUTH':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Rehydrate session from stored tokens
  useEffect(() => {
    const rehydrate = async () => {
      const tokens = getStoredTokens();
      if (!tokens?.accessToken) {
        dispatch({ type: 'CLEAR_AUTH' });
        return;
      }

      try {
        const payload = jwtDecode<JwtPayload>(tokens.accessToken);
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
          dispatch({ type: 'CLEAR_AUTH' });
          return;
        }

        const user = await authService.getProfile();
        dispatch({
          type: 'SET_USER',
          payload: { user, tokens: { ...tokens, tokenType: 'Bearer', expiresIn: payload.exp } },
        });
      } catch {
        dispatch({ type: 'CLEAR_AUTH' });
      }
    };

    rehydrate();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { user, tokens } = await authService.login(credentials);
      dispatch({ type: 'SET_USER', payload: { user, tokens } });
    } catch (err) {
      dispatch({ type: 'CLEAR_AUTH' });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    dispatch({ type: 'CLEAR_AUTH' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
