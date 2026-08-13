import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Tooltip,
  useTheme,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────
export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 64;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Panel', path: '/dashboard', icon: <DashboardOutlinedIcon fontSize="small" /> },
  { label: 'Belgeler', path: '/documents', icon: <FolderOutlinedIcon fontSize="small" /> },
  { label: 'Yükle', path: '/documents/upload', icon: <CloudUploadOutlinedIcon fontSize="small" /> },
  { label: 'MT Kontrol', path: '/mt/kontrol', icon: <CompareArrowsOutlinedIcon fontSize="small" /> },
  { label: 'MT Mesajları', path: '/mt/mesajlar', icon: <MessageOutlinedIcon fontSize="small" /> },
  { label: 'Rambursman', path: '/mt/rambursman', icon: <AccountBalanceOutlinedIcon fontSize="small" /> },
  { label: 'Raporlar', path: '/reports', icon: <AssessmentOutlinedIcon fontSize="small" /> },
];

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'temporary';
}

const SidebarContent = ({ collapsed }: { collapsed: boolean }) => {
  const { user } = useAuth();
  const location = useLocation();
  const theme = useTheme();

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  const renderItem = (item: NavItem) => {
    if (item.roles && (!user || !item.roles.includes(user.role))) return null;

    const active = isActive(item.path);

    return (
      <Tooltip title={collapsed ? item.label : ''} placement="right" key={item.path}>
        <ListItemButton
          component={NavLink}
          to={item.path}
          selected={active}
          sx={{
            borderRadius: 2,
            mx: 1,
            mb: 0.5,
            minHeight: 40,
            px: collapsed ? 1.5 : 2,
            justifyContent: collapsed ? 'center' : 'flex-start',
            '&.Mui-selected': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)',
              color: theme.palette.primary.main,
              '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
            },
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: collapsed ? 0 : 36,
              color: active ? theme.palette.primary.main : theme.palette.text.secondary,
            }}
          >
            {item.icon}
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 400 }}
            />
          )}
        </ListItemButton>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', py: 1 }}>
      {/* Logo */}
      <Box sx={{ px: 2, py: 1.5, mb: 1 }}>
        {collapsed ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>
              VK
            </Typography>
          </Box>
        ) : (
          <Typography variant="h6" fontWeight={700} color="primary">
            Vesaik Kontrol
          </Typography>
        )}
      </Box>

      <Divider sx={{ mx: 1, mb: 1 }} />

      <List dense disablePadding sx={{ flex: 1 }}>
        {NAV_ITEMS.map(renderItem)}
      </List>
    </Box>
  );
};

const Sidebar = ({ open, collapsed, onClose, variant = 'permanent' }: SidebarProps) => {
  const theme = useTheme();
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const drawerStyles = {
    width,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width,
      boxSizing: 'border-box',
      borderRight: `1px solid ${theme.palette.divider}`,
      bgcolor: 'background.paper',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      overflowX: 'hidden',
    },
  };

  if (variant === 'temporary') {
    return (
      <Drawer variant="temporary" open={open} onClose={onClose} sx={drawerStyles} ModalProps={{ keepMounted: true }}>
        <SidebarContent collapsed={false} />
      </Drawer>
    );
  }

  return (
    <Drawer variant="permanent" open sx={drawerStyles}>
      <SidebarContent collapsed={collapsed} />
    </Drawer>
  );
};

export default Sidebar;
