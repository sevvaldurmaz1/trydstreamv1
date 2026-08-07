import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';

interface TopBarProps {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onCollapseSidebar: () => void;
  isMobile: boolean;
}

const TopBar = ({
  sidebarOpen,
  sidebarCollapsed,
  onToggleSidebar,
  onCollapseSidebar,
  isMobile,
}: TopBarProps) => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${sidebarWidth}px)` },
        ml: { md: `${sidebarWidth}px` },
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: '56px !important' }}>
        {/* Mobile burger / Desktop collapse toggle */}
        <IconButton
          size="small"
          onClick={isMobile ? onToggleSidebar : onCollapseSidebar}
          sx={{ color: 'text.secondary' }}
        >
          {isMobile || !sidebarCollapsed ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
        </IconButton>

        <Box sx={{ flex: 1 }} />

        {/* Theme toggle */}
        <Tooltip title={mode === 'dark' ? 'Açık Tema' : 'Koyu Tema'}>
          <IconButton size="small" onClick={toggleTheme} sx={{ color: 'text.secondary' }}>
            {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="Bildirimler">
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <NotificationsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* User menu */}
        <Tooltip title="Hesap">
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar
              sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 600 }}
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { mt: 1, minWidth: 200, borderRadius: 2 } }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                }}
              >
                {user?.role}
              </Typography>
            </Box>
          </Box>
          <Divider />
          <MenuItem onClick={() => { setAnchorEl(null); logout(); }} sx={{ fontSize: '0.875rem', color: 'error.main' }}>
            Çıkış Yap
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
