import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, CircularProgress, Grid, List, ListItemButton, ListItemText,
  Chip, Collapse, IconButton, Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LinkIcon from '@mui/icons-material/Link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { mt799Service } from '../../services/mtService';
import type { Mt799Message } from '../../types/mt';

const MT799_PLACEHOLDER = `{1:F01BANKTRISAXXX0000000000}{2:O7991200060811BANKTRISAXXX0}{4:
:20:REF799001
:21:LC2026/0825/TR
:79:PLEASE BE ADVISED THAT THE ABOVE MENTIONED LC WILL BE ISSUED
SHORTLY. KINDLY AWAIT FORMAL MT700.
-}`;

const Mt799Page = () => {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Mt799Message | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['mt799-list'],
    queryFn: () => mt799Service.list(),
  });

  const parseMutation = useMutation({
    mutationFn: () => mt799Service.parseAndSave(rawText),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mt799-list'] });
      setLastSaved(data);
      setRawText('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'MT799 ayrıştırılamadı.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mt799Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt799-list'] });
    },
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>MT 799 — Serbest Format Mesajlar</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Ham SWIFT MT799 metnini yapıştırın — :20: referans, :21: ilişkili referans ve :79: serbest metin otomatik ayrıştırılır. :21: alanı kayıtlı bir MT700'ün referansıyla eşleşirse otomatik bağlanır.
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
          Kaydedildi — Referans: {lastSaved.referenceNumber || '—'}
          {lastSaved.relatedReference && ` · İlişkili Referans: ${lastSaved.relatedReference}`}
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
                MT799 Metnini Yapıştır
              </Typography>

              <TextField
                multiline
                rows={12}
                fullWidth
                variant="outlined"
                placeholder={MT799_PLACEHOLDER}
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

        {/* Sağ: Geçmiş Mesajlar */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Geçmiş Mesajlar {messages && `(${messages.length})`}
              </Typography>

              {isLoading ? (
                <CircularProgress size={24} />
              ) : !messages || messages.length === 0 ? (
                <Alert severity="info">Henüz MT799 mesajı yok.</Alert>
              ) : (
                <List dense disablePadding>
                  {messages.map((m: Mt799Message) => (
                    <React.Fragment key={m.id}>
                      <ListItemButton
                        onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                        sx={{ borderRadius: 1.5, mb: 0.5, bgcolor: 'action.hover' }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight={600}>
                                {m.referenceNumber || `Mesaj #${m.id}`}
                              </Typography>
                              {m.mt700Reference && (
                                <Chip icon={<LinkIcon fontSize="small" />} label={`MT700: ${m.mt700Reference}`} size="small" color="success" variant="outlined" />
                              )}
                              {!m.mt700Reference && m.relatedReference && (
                                <Chip label={`İlişkili: ${m.relatedReference} (eşleşmedi)`} size="small" color="warning" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {(m.messageText || '').slice(0, 80)}
                              {(m.messageText || '').length > 80 ? '…' : ''} · {format(new Date(m.createdAt), 'd MMM yyyy HH:mm')}
                            </Typography>
                          }
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(m.id);
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        {expandedId === m.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </ListItemButton>
                      <Collapse in={expandedId === m.id}>
                        <Box sx={{ p: 2, mb: 1, bgcolor: 'action.hover', borderRadius: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {m.messageText}
                        </Box>
                      </Collapse>
                      <Divider sx={{ my: 0.5 }} />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Mt799Page;
