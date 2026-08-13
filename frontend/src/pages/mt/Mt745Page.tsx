import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  MenuItem, Select, FormControl, InputLabel, Alert,
  CircularProgress, Grid, Table, TableHead, TableBody, TableRow,
  TableCell, Chip, IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { mt745Service, mtService } from '../../services/mtService';
import type { Mt745Claim } from '../../types/mt';

const STATUS_CONFIG: Record<Mt745Claim['status'], { label: string; color: 'warning' | 'info' | 'success' | 'error' }> = {
  PENDING: { label: 'Bekliyor', color: 'warning' },
  APPROVED: { label: 'Onaylandı', color: 'info' },
  PAID: { label: 'Ödendi', color: 'success' },
  REJECTED: { label: 'Reddedildi', color: 'error' },
};

const Mt745Page = () => {
  const queryClient = useQueryClient();

  const [mt700Id, setMt700Id] = useState<number | ''>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [claimingBank, setClaimingBank] = useState('');
  const [reimbursingBank, setReimbursingBank] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [valueDate, setValueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: mt700List } = useQuery({
    queryKey: ['mt-messages-list'],
    queryFn: () => mtService.listMtMessages(),
  });

  const { data: claims, isLoading } = useQuery({
    queryKey: ['mt745-list'],
    queryFn: () => mt745Service.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      mt745Service.create({
        mt700Id: mt700Id || undefined,
        mt700Reference: undefined,
        referenceNumber: referenceNumber || undefined,
        claimingBank,
        reimbursingBank: reimbursingBank || undefined,
        currency,
        amount: parseFloat(amount),
        valueDate: valueDate || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt745-list'] });
      setReferenceNumber('');
      setClaimingBank('');
      setReimbursingBank('');
      setAmount('');
      setValueDate('');
      setNotes('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Rambursman talebi oluşturulamadı.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => mt745Service.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt745-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mt745Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt745-list'] });
    },
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>MT 745 — Rambursman Talepleri</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Bir akreditife bağlı masraf/rambursman taleplerini kaydedin ve durumlarını takip edin.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Sol: Yeni Talep */}
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Yeni Rambursman Talebi
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Bağlı MT 700 (opsiyonel)</InputLabel>
                <Select
                  value={mt700Id}
                  onChange={(e) => setMt700Id(e.target.value as number)}
                  label="Bağlı MT 700 (opsiyonel)"
                >
                  <MenuItem value="">
                    <em>Yok</em>
                  </MenuItem>
                  {(mt700List ?? []).map((mt) => (
                    <MenuItem key={mt.id} value={mt.id}>
                      {mt.referenceNumber || `MT700 #${mt.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Referans No (opsiyonel)"
                fullWidth
                size="small"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Talep Eden Banka"
                fullWidth
                size="small"
                required
                value={claimingBank}
                onChange={(e) => setClaimingBank(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Rambursman Bankası (opsiyonel)"
                fullWidth
                size="small"
                value={reimbursingBank}
                onChange={(e) => setReimbursingBank(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <TextField
                  label="Döviz"
                  size="small"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Tutar"
                  type="number"
                  size="small"
                  fullWidth
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Box>

              <TextField
                label="Valör Tarihi"
                type="date"
                size="small"
                fullWidth
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Notlar (opsiyonel)"
                multiline
                rows={3}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                fullWidth
                disabled={!claimingBank.trim() || !currency.trim() || !amount || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {createMutation.isPending ? 'Oluşturuluyor…' : 'Talep Oluştur'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Sağ: Talepler Tablosu */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Rambursman Talepleri {claims && `(${claims.length})`}
              </Typography>

              {isLoading ? (
                <CircularProgress size={24} />
              ) : !claims || claims.length === 0 ? (
                <Alert severity="info">Henüz rambursman talebi yok.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Referans</TableCell>
                      <TableCell>MT700</TableCell>
                      <TableCell>Talep Eden Banka</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell>Valör</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {claims.map((c: Mt745Claim) => (
                      <TableRow key={c.id} hover>
                        <TableCell>{c.referenceNumber || '—'}</TableCell>
                        <TableCell>{c.mt700Reference || '—'}</TableCell>
                        <TableCell>{c.claimingBank}</TableCell>
                        <TableCell align="right">{c.currency} {c.amount.toLocaleString()}</TableCell>
                        <TableCell>{c.valueDate ? format(new Date(c.valueDate), 'd MMM yyyy') : '—'}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={c.status}
                            onChange={(e) => statusMutation.mutate({ id: c.id, status: e.target.value })}
                            renderValue={(val) => (
                              <Chip label={STATUS_CONFIG[val as Mt745Claim['status']].label} size="small" color={STATUS_CONFIG[val as Mt745Claim['status']].color} />
                            )}
                            sx={{ minWidth: 130 }}
                          >
                            {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                              <MenuItem key={value} value={value}>{cfg.label}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => deleteMutation.mutate(c.id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Mt745Page;
