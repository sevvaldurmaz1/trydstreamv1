import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  MenuItem, Select, FormControl, InputLabel, Alert,
  CircularProgress, ToggleButton, ToggleButtonGroup, Grid,
  List, ListItemButton, ListItemText, Chip, Collapse, IconButton, Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { mt799Service, mtService } from '../../services/mtService';
import type { Mt799Message } from '../../types/mt';

const Mt799Page = () => {
  const queryClient = useQueryClient();

  const [mt700Id, setMt700Id] = useState<number | ''>('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [senderBic, setSenderBic] = useState('');
  const [receiverBic, setReceiverBic] = useState('');
  const [subject, setSubject] = useState('');
  const [direction, setDirection] = useState<'OUTGOING' | 'INCOMING'>('OUTGOING');
  const [messageText, setMessageText] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: mt700List } = useQuery({
    queryKey: ['mt-messages-list'],
    queryFn: () => mtService.listMtMessages(),
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ['mt799-list'],
    queryFn: () => mt799Service.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      mt799Service.create({
        mt700Id: mt700Id || undefined,
        referenceNumber: referenceNumber || undefined,
        senderBic: senderBic || undefined,
        receiverBic: receiverBic || undefined,
        subject: subject || undefined,
        direction,
        messageText,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt799-list'] });
      setReferenceNumber('');
      setSenderBic('');
      setReceiverBic('');
      setSubject('');
      setMessageText('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'MT799 kaydedilemedi.');
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
          Bankalar arası ön bildirim, soru/açıklama gibi serbest metinli yazışmaları kaydedin — isteğe bağlı olarak bir MT 700'e bağlayın.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Sol: Yeni Mesaj */}
        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Yeni MT 799 Mesajı
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

              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <TextField
                  label="Gönderen BIC"
                  fullWidth
                  size="small"
                  value={senderBic}
                  onChange={(e) => setSenderBic(e.target.value)}
                />
                <TextField
                  label="Alıcı BIC"
                  fullWidth
                  size="small"
                  value={receiverBic}
                  onChange={(e) => setReceiverBic(e.target.value)}
                />
              </Box>

              <TextField
                label="Konu (opsiyonel)"
                fullWidth
                size="small"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                sx={{ mb: 2 }}
              />

              <ToggleButtonGroup
                exclusive
                value={direction}
                onChange={(_, val) => val && setDirection(val)}
                size="small"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="OUTGOING">Gönderilen</ToggleButton>
                <ToggleButton value="INCOMING">Gelen</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                label="Mesaj Metni"
                multiline
                rows={8}
                fullWidth
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                fullWidth
                disabled={!messageText.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {createMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={m.direction === 'OUTGOING' ? 'Gönderilen' : 'Gelen'}
                                size="small"
                                color={m.direction === 'OUTGOING' ? 'primary' : 'success'}
                              />
                              <Typography variant="body2" fontWeight={600}>
                                {m.subject || m.referenceNumber || `Mesaj #${m.id}`}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {m.messageText.slice(0, 80)}
                              {m.messageText.length > 80 ? '…' : ''} · {format(new Date(m.createdAt), 'd MMM yyyy HH:mm')}
                              {m.mt700Reference && ` · MT700: ${m.mt700Reference}`}
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
