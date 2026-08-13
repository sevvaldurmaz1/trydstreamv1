import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Select, MenuItem, Alert, CircularProgress, Grid, Table, TableHead,
  TableBody, TableRow, TableCell, Chip, IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { mt745Service } from '../../services/mtService';
import type { Mt745Claim } from '../../types/mt';

const STATUS_CONFIG: Record<Mt745Claim['status'], { label: string; color: 'warning' | 'info' | 'success' | 'error' }> = {
  PENDING: { label: 'Bekliyor', color: 'warning' },
  APPROVED: { label: 'Onaylandı', color: 'info' },
  PAID: { label: 'Ödendi', color: 'success' },
  REJECTED: { label: 'Reddedildi', color: 'error' },
};

const MT745_PLACEHOLDER = `{1:F01BANKTRISAXXX0000000000}{2:O7451200060811BANKTRISAXXX0}{4:
:20:REF745001
:21:LC2026/0825/TR
:32B:USD150,50
:57A:GLBRUSNYXXX
:71B:DOCUMENT EXAMINATION CHARGES
-}`;

const Mt745Page = () => {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Mt745Claim | null>(null);

  const { data: claims, isLoading } = useQuery({
    queryKey: ['mt745-list'],
    queryFn: () => mt745Service.list(),
  });

  const parseMutation = useMutation({
    mutationFn: () => mt745Service.parseAndSave(rawText),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt745-list'] });
      setLastSaved(data);
      setRawText('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'MT745 ayrıştırılamadı.');
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
          Ham SWIFT MT745 metnini yapıştırın — :20: referans, :21: ilişkili referans, :32B: tutar, :57A/D: rambursman bankası ve :71B: masraf detayı otomatik ayrıştırılır.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {lastSaved && (
        <Alert
          severity={lastSaved.mt700Id ? 'success' : 'info'}
          sx={{ mb: 2 }}
          onClose={() => setLastSaved(null)}
          icon={lastSaved.mt700Id ? <LinkIcon fontSize="small" /> : undefined}
        >
          Kaydedildi — Referans: {lastSaved.referenceNumber || '—'} · Tutar: {lastSaved.currency || '—'} {lastSaved.amount ?? '—'}
          {lastSaved.mt700Id
            ? ` · MT700 (${lastSaved.mt700Reference}) ile otomatik eşleşti`
            : lastSaved.relatedReference
            ? ' · İlişkili referansla eşleşen kayıtlı bir MT700 bulunamadı'
            : ''}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Sol: Ayrıştır */}
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                MT745 Metnini Yapıştır
              </Typography>

              <TextField
                multiline
                rows={12}
                fullWidth
                variant="outlined"
                placeholder={MT745_PLACEHOLDER}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                sx={{ mb: 1.5 }}
              />

              <Button
                variant="contained"
                fullWidth
                disabled={!rawText.trim() || parseMutation.isPending}
                onClick={() => parseMutation.mutate()}
                startIcon={parseMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {parseMutation.isPending ? 'Ayrıştırılıyor…' : 'Ayrıştır ve Kaydet'}
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
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell>Rambursman Bankası</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {claims.map((c: Mt745Claim) => (
                      <TableRow key={c.id} hover>
                        <TableCell>{c.referenceNumber || '—'}</TableCell>
                        <TableCell>
                          {c.mt700Reference ? (
                            <Chip icon={<LinkIcon fontSize="small" />} label={c.mt700Reference} size="small" color="success" variant="outlined" />
                          ) : c.relatedReference ? (
                            <Chip label={`${c.relatedReference} (eşleşmedi)`} size="small" color="warning" variant="outlined" />
                          ) : '—'}
                        </TableCell>
                        <TableCell align="right">{c.currency || '—'} {c.amount != null ? c.amount.toLocaleString() : '—'}</TableCell>
                        <TableCell>{c.reimbursingBank || '—'}</TableCell>
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
