import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Typography, useTheme } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const theme = useTheme();

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      {/* Left – Branding Panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 8,
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
              : 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-30%',
            right: '-20%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          },
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#fff', mb: 1 }}>
            Vesaik Kontrol
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}
          >
            Yapay Zeka Destekli Ticaret Finansmanı Belge İşleme
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[
            { icon: '🔍', title: 'Akıllı OCR Çıkarma', desc: 'Konşimento, Fatura ve Akreditiflerden anahtar alanları otomatik olarak çıkarır.' },
            { icon: '✅', title: 'Yapay Zeka Doğrulama Motoru', desc: 'Tutarsızlıkları, uyumsuzlukları ve eksik alanları güven puanıyla tespit eder.' },
            { icon: '📊', title: 'Kurumsal Kontrol Paneli', desc: 'Belge işleme süreçleri ve doğrulama durumu için gerçek zamanlı görünürlük.' },
          ].map((item) => (
            <Box key={item.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 0.25 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {item.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right – Auth Form */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 6 },
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;
