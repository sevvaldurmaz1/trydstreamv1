import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, CircularProgress, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, IconButton,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EventIcon from '@mui/icons-material/Event';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { mt707Service } from '../../services/mtService';
import type { Mt707Amendment } from '../../types/mt';

const MT707_PLACEHOLDER = `{1:F01BANKTRISAXXX0000000000}{2:O7071200060813BANKTRISAXXX0}{4:
:20:REF707001
:21:LC2026/0901/TR
:26E:1/1
:30:260813
:31E:270228
:32B:USD10000,00
:79:EXPIRY DATE EXTENDED AND CREDIT AMOUNT INCREASED BY USD 10,000.00
AS PER BENEFICIARY'S REQUEST. ALL OTHER TERMS AND CONDITIONS
REMAIN UNCHANGED.
-}`;

const ChangeSummary = ({ a }: { a: Mt707Amendment }) => {
  const items: React.ReactNode[] = [];
  if (a.newExpiryDate) {
    items.push(
      <Chip key="exp" icon={<EventIcon fontSize="small" />} size="small" color="info" variant="outlined"
        label={`Yeni Vade: ${format(new Date(a.newExpiryDate), 'd MMM yyyy')}`} />
    );
  }
  if (a.amountIncrease) {
    items.push(
      <Chip key="inc" icon={<TrendingUpIcon fontSize="small" />} size="small" color="success" variant="outlined"
        label={`+${a.currency ?? ''} ${a.amountIncrease.toLocaleString()}`} />
    );
  }
  if (a.amountDecrease) {
    items.push(
      <Chip key="dec" icon={<TrendingDownIcon fontSize="small" />} size="small" color="error" variant="outlined"
        label={`-${a.currency ?? ''} ${a.amountDecrease.toLocaleString()}`} />
    );
  }
  if (a.newAmount) {
    items.push(
      <Chip key="new" size="small" color="primary" variant="outlined"
        label={`Yeni Tutar: ${a.currency ?? ''} ${a.newAmount.toLocaleString()}`} />
    );
  }
  if (a.newLatestShipmentDate) {
    items.push(
      <Chip key="ship" icon={<EventIcon fontSize="small" />} size="small" variant="outlined"
        label={`Yeni Son Yükleme: ${format(new Date(a.newLatestShipmentDate), 'd MMM yyyy')}`} />
    );
  }
  if (items.length === 0) {
    return <Typography variant="caption" color="text.secondary">Yapısal değişiklik yok (bkz. metin)</Typography>;
  }
  return <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{items}</Box>;
};

const Mt707Page = () => {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Mt707Amendment | null>(null);

  const { data: amendments, isLoading } = useQuery({
    queryKey: ['mt707-list'],
    queryFn: () => mt707Service.list(),
  });

  const parseMutation = useMutation({
    mutationFn: () => mt707Service.parseAndSave(rawText),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt707-list'] });
      setLastSaved(data);
      setRawText('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'MT707 ayrıştırılamadı.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mt707Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt707-list'] });
    },
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>MT 707 — Akreditif Değişiklik Bildirimi</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Ham SWIFT MT707 metnini yapıştırın — değişiklik no, yeni vade, tutar artış/azalışı ve yeni son yükleme tarihi otomatik ayrıştırılır. :21: alanı kayıtlı bir MT700'ün referansıyla eşleşirse otomatik bağlanır.
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
          Kaydedildi — Değişiklik No: {lastSaved.amendmentNumber || '—'}
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
                MT707 Metnini Yapıştır
              </Typography>

              <TextField
                multiline
                rows={12}
                fullWidth
                variant="outlined"
                placeholder={MT707_PLACEHOLDER}
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

        {/* Sağ: Değişiklikler Listesi */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Kaydedilen Değişiklikler {amendments && `(${amendments.length})`}
              </Typography>

              {isLoading ? (
                <CircularProgress size={24} />
              ) : !amendments || amendments.length === 0 ? (
                <Alert severity="info">Henüz MT707 değişikliği yok.</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Değ. No</TableCell>
                      <TableCell>MT700</TableCell>
                      <TableCell>Değişiklikler</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {amendments.map((a: Mt707Amendment) => (
                      <TableRow key={a.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.amendmentNumber || '—'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {a.mt700Reference ? (
                            <Chip icon={<LinkIcon fontSize="small" />} label={a.mt700Reference} size="small" color="success" variant="outlined" />
                          ) : a.relatedReference ? (
                            <Chip label={`${a.relatedReference} (eşleşmedi)`} size="small" color="warning" variant="outlined" />
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <ChangeSummary a={a} />
                          {a.narrative && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              {a.narrative.slice(0, 100)}{a.narrative.length > 100 ? '…' : ''}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => deleteMutation.mutate(a.id)}>
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

export default Mt707Page;
