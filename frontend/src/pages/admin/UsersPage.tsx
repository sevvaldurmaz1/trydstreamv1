import React from 'react';
import {
  Box, Card, CardContent, Typography, Button,
  Table, TableHead, TableBody, TableRow, TableCell, Chip,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';
import type { ApiResponse, PagedResponse, User } from '../../types';

const ROLE_COLORS: Record<string, 'error' | 'primary' | 'warning' | 'default'> = {
  ADMIN: 'error',
  BANK_OFFICER: 'primary',
  REVIEWER: 'warning',
  CUSTOMER: 'default',
};

const UsersPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PagedResponse<User>>>('/admin/users');
      return res.data.data;
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Kullanıcı Yönetimi</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Platform kullanıcılarını ve rollerini yönetin.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddOutlinedIcon />}>
          Kullanıcı Ekle
        </Button>
      </Box>
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ad Soyad</TableCell>
                <TableCell>E-posta</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Katılım Tarihi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.content ?? []).map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {user.firstName} {user.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      color={ROLE_COLORS[user.role] ?? 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? 'Aktif' : 'Pasif'}
                      size="small"
                      color={user.isActive ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UsersPage;
