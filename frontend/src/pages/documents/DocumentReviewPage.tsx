import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Button, TextField,
  Chip, Skeleton, Divider, Alert, LinearProgress, Tooltip,
  Table, TableBody, TableCell, TableRow,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { documentService } from '../../services/documentService';
import StatusChip from '../../components/common/StatusChip';
import { format } from 'date-fns';
import type { ExtractedField } from '../../types';

// ── Confidence Badge ─────────────────────────────────────────────
const ConfidenceBadge = ({ score }: { score: number }) => {
  const color = score >= 0.85 ? 'success' : score >= 0.6 ? 'warning' : 'error';
  return (
    <Chip
      label={`${Math.round(score * 100)}%`}
      color={color}
      size="small"
      variant="outlined"
      sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
    />
  );
};

// ── Editable Field Row ────────────────────────────────────────────
const FieldRow = ({
  field,
  documentId,
}: {
  field: ExtractedField;
  documentId: number;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field.correctedValue ?? field.fieldValue ?? '');
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (correctedValue: string) =>
      documentService.correctField(documentId, field.id, correctedValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extracted-fields', documentId] });
      setEditing(false);
    },
  });

  return (
    <TableRow hover>
      <TableCell sx={{ width: 180 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing="0.06em">
          {field.fieldName.replace(/_/g, ' ')}
        </Typography>
      </TableCell>
      <TableCell>
        {editing ? (
          <TextField
            size="small"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fullWidth
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') saveMutation.mutate(value); if (e.key === 'Escape') setEditing(false); }}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" fontWeight={field.isCorrected ? 600 : 400}>
              {field.correctedValue ?? field.fieldValue ?? '—'}
            </Typography>
            {field.isCorrected && (
              <Chip label="Düzeltildi" size="small" color="info" sx={{ fontSize: '0.65rem', height: 18 }} />
            )}
          </Box>
        )}
      </TableCell>
      <TableCell sx={{ width: 80 }}>
        <ConfidenceBadge score={field.confidenceScore} />
      </TableCell>
      <TableCell sx={{ width: 80 }} align="right">
        {editing ? (
          <Button size="small" startIcon={<SaveOutlinedIcon fontSize="small" />} onClick={() => saveMutation.mutate(value)} disabled={saveMutation.isPending}>
            Kaydet
          </Button>
        ) : (
          <Tooltip title="Değeri düzenle">
            <Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => setEditing(true)}>
              Düzenle
            </Button>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
};

// ── Document Review Page ──────────────────────────────────────────
const DocumentReviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const documentId = Number(id);

  const { data: doc, isLoading: loadingDoc } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentService.getDocument(documentId),
  });

  const { data: fields, isLoading: loadingFields } = useQuery({
    queryKey: ['extracted-fields', documentId],
    queryFn: () => documentService.getExtractedFields(documentId),
  });

  const { data: validation, isLoading: loadingValidation } = useQuery({
    queryKey: ['validation', documentId],
    queryFn: () => documentService.getValidationResult(documentId),
  });

  const validateMutation = useMutation({
    mutationFn: () => documentService.triggerValidation(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation', documentId] });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
  });

  const isLoading = loadingDoc || loadingFields || loadingValidation;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Button size="small" onClick={() => navigate('/documents')} sx={{ mb: 1, color: 'text.secondary' }}>
            ← Belgelere Dön
          </Button>
          <Typography variant="h5" fontWeight={700}>
            {loadingDoc ? <Skeleton width={300} /> : doc?.fileName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.75, alignItems: 'center' }}>
            {doc && <StatusChip status={doc.status} />}
            {doc?.uploadedAt && (
              <Typography variant="caption" color="text.secondary">
                Yüklendi: {format(new Date(doc.uploadedAt), 'd MMM yyyy HH:mm')}
              </Typography>
            )}
          </Box>
        </Box>
        <Button
          variant="outlined"
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
        >
          {validateMutation.isPending ? 'Doğrulanıyor…' : 'Yeniden Doğrula'}
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        {/* Left – Extracted Fields */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Çıkarılan Alanlar
                {fields && (
                  <Chip
                    label={`${fields.length} alan`}
                    size="small"
                    sx={{ ml: 1, fontSize: '0.7rem' }}
                  />
                )}
              </Typography>
              {loadingFields ? (
                Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />)
              ) : fields?.length === 0 ? (
                <Alert severity="info">Henüz alan çıkarılmadı. İşlem hâlâ devam ediyor olabilir.</Alert>
              ) : (
                <Table size="small">
                  <TableBody>
                    {(fields ?? []).map((field) => (
                      <FieldRow key={field.id} field={field} documentId={documentId} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right – Validation Result */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ mb: 2.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Doğrulama Sonucu
              </Typography>
              {loadingValidation ? (
                <Skeleton height={120} />
              ) : !validation ? (
                <Alert severity="info">Henüz doğrulama sonucu yok.</Alert>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    {validation.overallStatus === 'PASSED' ? (
                      <CheckCircleOutlinedIcon color="success" />
                    ) : validation.overallStatus === 'WARNING' ? (
                      <WarningAmberOutlinedIcon color="warning" />
                    ) : (
                      <ErrorOutlineIcon color="error" />
                    )}
                    <Box>
                      <StatusChip status={validation.overallStatus} />
                      <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                        Doğrulandı: {format(new Date(validation.validatedAt), 'd MMM HH:mm')}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                      <Typography variant="h5" fontWeight={700}
                        color={validation.confidenceScore >= 80 ? 'success.main' : validation.confidenceScore >= 60 ? 'warning.main' : 'error.main'}
                      >
                        {validation.confidenceScore}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Güven Puanı</Typography>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={validation.confidenceScore}
                    color={validation.confidenceScore >= 80 ? 'success' : validation.confidenceScore >= 60 ? 'warning' : 'error'}
                    sx={{ borderRadius: 4, height: 6, mb: 2 }}
                  />

                  {validation.notes && (
                    <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem' }}>
                      {validation.notes}
                    </Alert>
                  )}

                  {/* Issues */}
                  {validation.issues.length > 0 && (
                    <>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="caption" fontWeight={600} textTransform="uppercase" letterSpacing="0.08em" color="text.secondary">
                        Sorunlar ({validation.issues.length})
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {validation.issues.map((issue) => (
                          <Box
                            key={issue.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: 'action.hover',
                              display: 'flex',
                              gap: 1.5,
                              alignItems: 'flex-start',
                            }}
                          >
                            <StatusChip status={issue.severity} />
                            <Box>
                              <Typography variant="caption" fontWeight={600} display="block">
                                {issue.issueType.replace(/_/g, ' ')}
                                {issue.fieldName && ` · ${issue.fieldName}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {issue.description}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Document info */}
          {doc && (
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                  Belge Bilgisi
                </Typography>
                <Table size="small">
                  <TableBody>
                    {[
                      ['Tür', doc.documentType?.name ?? '—'],
                      ['Boyut', `${(doc.fileSize / 1024).toFixed(1)} KB`],
                      ['Format', doc.mimeType],
                      ['Çıkarılan Alan', doc.extractedFieldCount],
                    ].map(([label, value]) => (
                      <TableRow key={String(label)}>
                        <TableCell sx={{ border: 0, pl: 0, py: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                        </TableCell>
                        <TableCell sx={{ border: 0, py: 0.5 }}>
                          <Typography variant="caption" fontWeight={500}>{value}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentReviewPage;
