import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Skeleton,
  Tooltip,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { documentService } from '../../services/documentService';
import StatusChip from '../../components/common/StatusChip';

const DocumentsPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['documents', page, rowsPerPage, search],
    queryFn: () =>
      documentService.getDocuments({
        page,
        size: rowsPerPage,
        search: search || undefined,
        sort: 'uploadedAt',
        direction: 'desc',
      }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentService.deleteDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Belgeler
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Toplam {data?.totalElements ?? 0} belge
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/documents/upload"
          variant="contained"
          startIcon={<CloudUploadOutlinedIcon />}
        >
          Yükle
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {/* Search bar */}
          <Box sx={{ p: 2, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
            <TextField
              size="small"
              placeholder="Belge ara…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 320 } }}
            />
          </Box>

          {/* Table */}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Dosya Adı</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Boyut</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Puan</TableCell>
                <TableCell>Yüklenme</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: rowsPerPage }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : (data?.content ?? []).map((doc) => (
                    <TableRow key={doc.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 280 }}>
                          {doc.fileName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={doc.documentType?.code ?? '—'}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatFileSize(doc.fileSize)}</Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={doc.status} />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            doc.validationScore == null
                              ? 'text.secondary'
                              : doc.validationScore >= 80
                              ? 'success.main'
                              : doc.validationScore >= 60
                              ? 'warning.main'
                              : 'error.main'
                          }
                        >
                          {doc.validationScore != null ? `${doc.validationScore}%` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(doc.uploadedAt), 'MMM d, yyyy HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="İncele">
                            <IconButton
                              size="small"
                              component={Link}
                              to={`/documents/${doc.id}/review`}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteMutation.mutate(doc.id)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={data?.totalElements ?? 0}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default DocumentsPage;
