import { createTheme, ThemeOptions } from '@mui/material/styles';

// ─────────────────────────────────────────────────────────────────
// Traydstream MUI Theme – Professional Enterprise Dark/Light
// Inspired by: Linear, Stripe Dashboard, Microsoft Fluent
// ─────────────────────────────────────────────────────────────────

const baseTypography: ThemeOptions['typography'] = {
  fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
  h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
  h2: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em' },
  h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em' },
  h4: { fontSize: '1.25rem', fontWeight: 600 },
  h5: { fontSize: '1.125rem', fontWeight: 600 },
  h6: { fontSize: '1rem', fontWeight: 600 },
  subtitle1: { fontSize: '0.9375rem', fontWeight: 500 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, color: 'inherit' },
  body1: { fontSize: '0.875rem' },
  body2: { fontSize: '0.8125rem' },
  caption: { fontSize: '0.75rem', letterSpacing: '0.01em' },
  button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
};

const baseComponents: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 8, padding: '7px 16px' },
      sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem' },
      sizeLarge: { padding: '10px 24px' },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: { borderRadius: 12, boxShadow: 'none' },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { backgroundImage: 'none' },
      rounded: { borderRadius: 12 },
    },
  },
  MuiTextField: {
    defaultProps: { variant: 'outlined', size: 'small' },
    styleOverrides: {
      root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
    },
  },
  MuiChip: {
    styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-root': {
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: { tooltip: { borderRadius: 6, fontSize: '0.75rem' } },
  },
};

// ── Light Theme ─────────────────────────────────────────────────
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8', contrastText: '#fff' },
    secondary: { main: '#7c3aed', light: '#8b5cf6', dark: '#6d28d9', contrastText: '#fff' },
    success: { main: '#059669', light: '#10b981', dark: '#047857', contrastText: '#fff' },
    warning: { main: '#d97706', light: '#f59e0b', dark: '#b45309', contrastText: '#fff' },
    error: { main: '#dc2626', light: '#ef4444', dark: '#b91c1c', contrastText: '#fff' },
    info: { main: '#0284c7', light: '#0ea5e9', dark: '#0369a1', contrastText: '#fff' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e2e8f0',
  },
  typography: baseTypography,
  components: {
    ...baseComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        },
      },
    },
  },
  shape: { borderRadius: 8 },
});

// ── Dark Theme ──────────────────────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb', contrastText: '#fff' },
    secondary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#fff' },
    success: { main: '#10b981', light: '#34d399', dark: '#059669', contrastText: '#fff' },
    warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', contrastText: '#000' },
    error: { main: '#ef4444', light: '#f87171', dark: '#dc2626', contrastText: '#fff' },
    info: { main: '#0ea5e9', light: '#38bdf8', dark: '#0284c7', contrastText: '#fff' },
    background: { default: '#0f172a', paper: '#1e293b' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8' },
    divider: '#334155',
  },
  typography: baseTypography,
  components: {
    ...baseComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: '1px solid #334155',
          backgroundColor: '#1e293b',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: '#1e293b' },
        rounded: { borderRadius: 12 },
      },
    },
  },
  shape: { borderRadius: 8 },
});
