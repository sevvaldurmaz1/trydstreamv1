import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '../components/navigation/Sidebar';
import TopBar from '../components/navigation/TopBar';

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Mobile drawer */}
      {isMobile && (
        <Sidebar
          open={mobileOpen}
          collapsed={false}
          onClose={() => setMobileOpen(false)}
          variant="temporary"
        />
      )}

      {/* Desktop permanent sidebar */}
      {!isMobile && (
        <Sidebar
          open
          collapsed={collapsed}
          onClose={() => {}}
          variant="permanent"
        />
      )}

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarWidth}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <TopBar
          sidebarOpen={mobileOpen}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setMobileOpen((p) => !p)}
          onCollapseSidebar={() => setCollapsed((p) => !p)}
          isMobile={isMobile}
        />

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            mt: '56px', // AppBar height
            p: { xs: 2, sm: 3 },
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
