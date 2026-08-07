import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useAuth } from '../../context/AuthContext';
import type { LoginRequest } from '../../types';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: LoginRequest) => {
    setError(null);
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Geçersiz kimlik bilgileri. Lütfen tekrar deneyin.';
      setError(msg);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Tekrar Hoş Geldiniz
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vesaik Kontrol hesabınıza giriş yapın
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="E-posta adresi"
          type="email"
          fullWidth
          autoComplete="email"
          autoFocus
          error={!!errors.email}
          helperText={errors.email?.message}
          {...register('email', {
            required: 'E-posta gereklidir',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Geçerli bir e-posta girin' },
          })}
        />

        <TextField
          label="Şifre"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setShowPassword((p) => !p)} edge="end">
                  {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          {...register('password', { required: 'Şifre gereklidir', minLength: { value: 6, message: 'En az 6 karakter' } })}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={isSubmitting}
          sx={{ mt: 1, py: 1.25 }}
        >
          {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Giriş Yap'}
        </Button>
      </Box>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5} fontWeight={600}>
          Demo Hesapları
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          admin@traydstream.com / Admin123!
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          officer@traydstream.com / Officer123!
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
