import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableHead, TableBody,
  TableRow, TableCell, IconButton, Collapse, Chip, Alert, CircularProgress,
  List, ListItem, ListItemText, Divider, Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { mtService, mt799Service, mt707Service } from '../../services/mtService';
import type { MtMessage } from '../../types/mt';

const Mt700Row = ({ mt }: { mt: MtMessage }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['mt799-by-mt700', mt.id],
    queryFn: () => mt799Service.listByMt700(mt.id),
    enabled: expanded,
  });

  const { data: amendments, isLoading: loadingAmendments } = useQuery({
    queryKey: ['mt707-by-mt700', mt.id],
    queryFn: () => mt707Service.listByMt700(mt.id),
    enabled: expanded,
  });

  const { data: reports, isLoading: loadingReports } = useQuery({
    queryKey: ['discrepancy-by-mt700', mt.id],
    queryFn: () => mtService.listReportsByMt700(mt.id),
    enabled: expanded,
  });

  const loading = loadingMessages || loadingAmendments || loadingReports;

  return (
    <>
      <TableRow hover onClick={() => setExpanded((p) => !p)} sx={{ cursor: 'pointer' }}>
        <TableCell>{mt.referenceNumber || `MT700 #${mt.id}`}</TableCell>
        <TableCell>{mt.lcCurrency} {mt.lcAmount?.toLocaleString() ?? '—'}</TableCell>
        <TableCell>{mt.lcExpiryDate ? format(new Date(mt.lcExpiryDate), 'd MMM yyyy') : '—'}</TableCell>
        <TableCell>{format(new Date(mt.createdAt), 'd MMM yyyy HH:mm')}</TableCell>
        <TableCell align="right">
          <IconButton size="small">
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
          <Collapse in={expanded}>
            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* MT799 */}
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <MessageOutlinedIcon fontSize="inherit" /> MT799 MESAJLARI ({messages?.length ?? 0})
                    </Typography>
                    {!messages || messages.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">Bağlı MT799 mesajı yok.</Typography>
                    ) : (
                      <List dense disablePadding>
                        {messages.map((m) => (
                          <ListItem key={m.id} disablePadding sx={{ py: 0.25 }}>
                            <ListItemText
                              primary={<Typography variant="body2">{m.referenceNumber || `#${m.id}`}</Typography>}
                              secondary={(m.messageText || '').slice(0, 90)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>

                  <Divider />

                  {/* MT707 */}
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <EditNoteOutlinedIcon fontSize="inherit" /> MT707 DEĞİŞİKLİKLERİ ({amendments?.length ?? 0})
                    </Typography>
                    {!amendments || amendments.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">Bağlı MT707 değişikliği yok.</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {amendments.map((a) => (
                          <Box key={a.id} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>{a.amendmentNumber || `#${a.id}`}</Typography>
                            {a.newExpiryDate && <Chip size="small" label={`Yeni Vade: ${format(new Date(a.newExpiryDate), 'd MMM yyyy')}`} />}
                            {a.amountIncrease && <Chip size="small" color="success" label={`+${a.currency} ${a.amountIncrease.toLocaleString()}`} />}
                            {a.amountDecrease && <Chip size="small" color="error" label={`-${a.currency} ${a.amountDecrease.toLocaleString()}`} />}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>

                  <Divider />

                  {/* Aykırılık Raporları */}
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      AYKIRILIK RAPORLARI ({reports?.length ?? 0})
                    </Typography>
                    {!reports || reports.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">Henüz aykırılık kontrolü yapılmadı.</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {reports.map((r) => (
                          <Button
                            key={r.id}
                            size="small"
                            variant="text"
                            sx={{ justifyContent: 'flex-start' }}
                            startIcon={r.overallResult === 'CLEAN' ? <CheckCircleOutlineIcon color="success" fontSize="small" /> : <ErrorOutlineIcon color="error" fontSize="small" />}
                            onClick={() => navigate(`/mt/report/${r.id}`)}
                          >
                            {r.documentFileName || `Belge #${r.documentId}`} — {r.overallResult} ({r.totalFindings} bulgu)
                          </Button>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const Mt700ListPage = () => {
  const { data: mtMessages, isLoading } = useQuery({
    queryKey: ['mt-messages-list'],
    queryFn: () => mtService.listMtMessages(),
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>MT700 Listesi</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Ayrıştırdığın tüm akreditifler ve her birine bağlı MT799 mesajları, MT707 değişiklikleri ve aykırılık raporları — bir satıra tıklayarak genişlet.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 2.5 }}>
          {isLoading ? (
            <CircularProgress size={24} />
          ) : !mtMessages || mtMessages.length === 0 ? (
            <Alert severity="info">Henüz ayrıştırılmış bir MT700 yok. MT Kontrol sayfasından başlayabilirsin.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Referans</TableCell>
                  <TableCell>Tutar</TableCell>
                  <TableCell>Vade</TableCell>
                  <TableCell>Ayrıştırılma Tarihi</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {mtMessages.map((mt) => (
                  <Mt700Row key={mt.id} mt={mt} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Mt700ListPage;
