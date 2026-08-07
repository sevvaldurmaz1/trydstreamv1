import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button,
  Table, TableBody, TableCell, TableHead, TableRow,
  Collapse, Alert, Skeleton, Divider, Grid,
  IconButton, Tooltip, useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { mtService } from '../../services/mtService';
import type { DiscrepancyFinding } from '../../types/mt';

// ── Sabit Renk Eşleşmesi ────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  HIGH: { color: 'error' as const, label: 'Kritik', icon: <ErrorOutlineIcon fontSize="small" /> },
  MEDIUM: { color: 'warning' as const, label: 'Orta', icon: <WarningAmberOutlinedIcon fontSize="small" /> },
  LOW: { color: 'default' as const, label: 'Düşük', icon: <WarningAmberOutlinedIcon fontSize="small" /> },
};

const FINDING_TYPE_CONFIG = {
  R: { color: 'error' as const, label: 'Zorunlu' },
  O: { color: 'primary' as const, label: 'İsteğe Bağlı' },
};

// ── Bulgu Satırı ─────────────────────────────────────────────────────────────

const FindingRow = ({ finding }: { finding: DiscrepancyFinding }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const sev = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.LOW;
  const ft = FINDING_TYPE_CONFIG[finding.findingType] ?? FINDING_TYPE_CONFIG.O;

  return (
    <>
      <TableRow
        hover
        sx={{
          borderLeft: `3px solid ${
            finding.severity === 'HIGH'
              ? theme.palette.error.main
              : finding.severity === 'MEDIUM'
              ? theme.palette.warning.main
              : theme.palette.divider
          }`,
        }}
      >
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            <Chip
              label={finding.ruleCode}
              size="small"
              color={ft.color}
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.7rem', minWidth: 52 }}
            />
            <Chip label={ft.label} size="small" color={ft.color} variant="filled" sx={{ fontSize: '0.65rem' }} />
          </Box>
        </TableCell>
        <TableCell>
          <Chip label={sev.label} size="small" color={sev.color} />
        </TableCell>
        <TableCell>
          <Typography variant="body2">{finding.description}</Typography>
          {(finding.isbpReference || finding.ucpReference) && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              {[finding.isbpReference, finding.ucpReference].filter(Boolean).join(' · ')}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {finding.mtValue || '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {finding.documentValue || '—'}
          </Typography>
        </TableCell>
        <TableCell align="right">
          {finding.aiExplanation && (
            <Tooltip title={expanded ? 'AI açıklamasını gizle' : 'AI açıklamasını göster'}>
              <IconButton size="small" onClick={() => setExpanded((p) => !p)}>
                {expanded ? <ExpandLessIcon fontSize="small" /> : <SmartToyOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      {/* AI Açıklaması Satırı */}
      {finding.aiExplanation && (
        <TableRow>
          <TableCell colSpan={6} sx={{ p: 0, border: 'none' }}>
            <Collapse in={expanded}>
              <Box
                sx={{
                  p: 2,
                  mx: 1,
                  mb: 1,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
                  borderRadius: 1.5,
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <SmartToyOutlinedIcon fontSize="small" color="primary" />
                  <Typography variant="caption" fontWeight={700} color="primary">
                    Qwen 14B AI Açıklaması
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {finding.aiExplanation}
                </Typography>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// ── Ana Sayfa ────────────────────────────────────────────────────────────────

const DiscrepancyReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();

  const { data: report, isLoading } = useQuery({
    queryKey: ['discrepancy-report', id],
    queryFn: () => mtService.getReportById(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box>
        <Skeleton height={60} sx={{ mb: 2 }} />
        <Skeleton height={120} sx={{ mb: 2 }} />
        <Skeleton height={300} />
      </Box>
    );
  }

  if (!report) {
    return <Alert severity="error">Rapor bulunamadı.</Alert>;
  }

  const isClean = report.overallResult === 'CLEAN';
  const mandatory = report.findings.filter((f) => f.findingType === 'R');
  const optional = report.findings.filter((f) => f.findingType === 'O');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Button
          component={Link}
          to="/mt/kontrol"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ mt: 0.5 }}
        >
          MT Kontrol'e Dön
        </Button>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" fontWeight={700}>
              Aykırılık Raporu
            </Typography>
            <Chip
              label={isClean ? 'TEMİZ' : 'AYKIRILI'}
              color={isClean ? 'success' : 'error'}
              icon={isClean ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {report.mtReference && `MT Ref: ${report.mtReference} · `}
            {report.documentFileName && `Belge: ${report.documentFileName} · `}
            {report.checkedAt && format(new Date(report.checkedAt), 'dd MMM yyyy HH:mm')}
          </Typography>
        </Box>
      </Box>

      {/* Özet Kartlar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Toplam Bulgu', value: report.totalFindings, color: report.totalFindings > 0 ? 'error.main' : 'success.main' },
          { label: 'Zorunlu (R)', value: report.mandatoryFindings, color: 'error.main' },
          { label: 'İsteğe Bağlı (O)', value: report.optionalFindings, color: 'warning.main' },
        ].map((m) => (
          <Grid item xs={4} key={m.label}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.08em">
                  {m.label}
                </Typography>
                <Typography variant="h3" fontWeight={700} color={m.color} sx={{ mt: 0.5 }}>
                  {m.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* AI Durum */}
      {report.notes && (
        <Alert severity="info" icon={<SmartToyOutlinedIcon />} sx={{ mb: 2 }}>
          {report.notes}
        </Alert>
      )}

      {/* Temiz Sonuç */}
      {isClean && (
        <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 2 }}>
          <Typography fontWeight={600}>Aykırılık Tespit Edilmedi</Typography>
          Kontrol edilen 193 kural kapsamında MT 700 ile belge arasında herhangi bir uyumsuzluk bulunmadı.
        </Alert>
      )}

      {/* Zorunlu Aykırılıklar */}
      {mandatory.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ErrorOutlineIcon color="error" />
              <Typography variant="subtitle1" fontWeight={600} color="error">
                Zorunlu Aykırılıklar (R Kodları) — {mandatory.length} adet
              </Typography>
            </Box>
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Zorunlu aykırılıklar bankanın belgeleri reddetmesine yol açar. Derhal düzeltilmelidir.
            </Alert>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kural</TableCell>
                  <TableCell>Önem</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell>MT Değeri</TableCell>
                  <TableCell>Belge Değeri</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {mandatory.map((f, i) => <FindingRow key={i} finding={f} />)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* İsteğe Bağlı Aykırılıklar */}
      {optional.length > 0 && (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningAmberOutlinedIcon color="warning" />
              <Typography variant="subtitle1" fontWeight={600}>
                İsteğe Bağlı Kontroller (O Kodları) — {optional.length} adet
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Bu bulgular belge tipine ve akreditif koşullarına bağlı olarak aykırılık sayılabilir.
            </Alert>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kural</TableCell>
                  <TableCell>Önem</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell>MT Değeri</TableCell>
                  <TableCell>Belge Değeri</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {optional.map((f, i) => <FindingRow key={i} finding={f} />)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DiscrepancyReportPage;
