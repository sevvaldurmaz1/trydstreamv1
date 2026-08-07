import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  MenuItem, Select, FormControl, InputLabel, Alert,
  CircularProgress, Stepper, Step, StepLabel, Chip,
  Grid, Divider, FormControlLabel, Switch, Collapse,
  useTheme,
} from '@mui/material';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import DocumentScannerOutlinedIcon from '@mui/icons-material/DocumentScannerOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { mtService } from '../../services/mtService';
import { documentService } from '../../services/documentService';
import type { MtMessage } from '../../types/mt';

const DOCUMENT_TYPES = [
  { value: 'FATURA', label: 'Ticari Fatura' },
  { value: 'KONSIMENTO', label: 'Konşimento (B/L)' },
  { value: 'AWB', label: 'Hava Konşimentosu (AWB)' },
  { value: 'SIGORTA', label: 'Sigorta Belgesi' },
  { value: 'MENSEI', label: 'Menşei Şehadetnamesi' },
  { value: 'KOLI_LISTESI', label: 'Koli / Paketleme Listesi' },
];

const STEPS = ['MT 700 Gir', 'Belge Seç', 'Kontrol Et'];

const MtKontrolPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  // Step 1 – MT
  const [mtText, setMtText] = useState('');
  const [parsedMt, setParsedMt] = useState<MtMessage | null>(null);

  // Step 2 – Belge
  const [selectedDocId, setSelectedDocId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState('FATURA');

  // Options
  const [useAi, setUseAi] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Belgeleri listele
  const { data: docsData } = useQuery({
    queryKey: ['documents-list'],
    queryFn: () => documentService.getDocuments({ page: 0, size: 50 }),
  });

  // MT ayrıştırma
  const parseMutation = useMutation({
    mutationFn: () => mtService.parseMt(mtText),
    onSuccess: (data) => {
      setParsedMt(data);
      setActiveStep(1);
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'MT ayrıştırılamadı.');
    },
  });

  // Aykırılık kontrolü
  const checkMutation = useMutation({
    mutationFn: () =>
      mtService.checkDiscrepancy({
        mtId: parsedMt!.id,
        documentId: selectedDocId as number,
        documentType,
        useAi,
      }),
    onSuccess: (data) => {
      if (data.id) {
        navigate(`/mt/report/${data.id}`);
      }
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Kontrol yapılamadı.');
    },
  });

  const MT_PLACEHOLDER = `:20:LC2024/001/TR
:27:1/1
:40A:IRREVOCABLE
:31C:240101
:31D:241231TURKEY
:32B:USD50000,00
:39A:5/5
:43P:NOT ALLOWED
:43T:ALLOWED
:44C:241130
:44E:ISTANBUL
:44F:HAMBURG
:45A:TEXTILE GOODS 100% COTTON AS PER PROFORMA INVOICE NO.2024/001
:46A:
+SIGNED COMMERCIAL INVOICE IN TRIPLICATE
+FULL SET CLEAN ON BOARD OCEAN BILL OF LADING
+INSURANCE CERTIFICATE
:48:21 DAYS AFTER B/L DATE
:50:SAMPLE IMPORT COMPANY LTD
ISTANBUL TURKEY
:59:SAMPLE EXPORT CO.
IZMIR TURKEY`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>MT Kontrol</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          SWIFT MT 700 akreditif mesajını fatura/belgelerle karşılaştırın. 193 kural kodu uygulanır.
        </Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Sol: Giriş Formu */}
        <Grid item xs={12} lg={7}>

          {/* STEP 1 – MT Metin */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DocumentScannerOutlinedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  1. SWIFT MT 700 Mesajı
                </Typography>
                {parsedMt && (
                  <Chip label="Ayrıştırıldı" color="success" size="small" icon={<CheckCircleOutlineIcon />} />
                )}
              </Box>

              <TextField
                multiline
                rows={14}
                fullWidth
                variant="outlined"
                placeholder={MT_PLACEHOLDER}
                value={mtText}
                onChange={(e) => setMtText(e.target.value)}
                disabled={!!parsedMt}
                InputProps={{
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                  },
                }}
              />

              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Button
                  variant="contained"
                  onClick={() => parseMutation.mutate()}
                  disabled={!mtText.trim() || parseMutation.isPending || !!parsedMt}
                  startIcon={parseMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  {parseMutation.isPending ? 'Ayrıştırılıyor…' : 'MT\'yi Ayrıştır'}
                </Button>
                {parsedMt && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setParsedMt(null);
                      setMtText('');
                      setActiveStep(0);
                    }}
                  >
                    Temizle
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* STEP 2 – Belge Seçimi */}
          <Collapse in={activeStep >= 1}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  2. Kontrol Edilecek Belge
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Yüklenmiş Belge Seç</InputLabel>
                  <Select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value as number)}
                    label="Yüklenmiş Belge Seç"
                  >
                    {(docsData?.content ?? []).map((doc) => (
                      <MenuItem key={doc.id} value={doc.id}>
                        {doc.fileName}
                        {doc.status === 'VALIDATED' || doc.status === 'EXTRACTED' ? (
                          <Chip label="OCR Hazır" size="small" color="success" sx={{ ml: 1 }} />
                        ) : (
                          <Chip label={doc.status} size="small" sx={{ ml: 1 }} />
                        )}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Belge Tipi</InputLabel>
                  <Select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    label="Belge Tipi"
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={useAi}
                      onChange={(e) => setUseAi(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        Qwen 14B AI Açıklaması
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Her aykırılık için ISBP/UCP'ye dayalı Türkçe açıklama üretir (Ollama gerektirir)
                      </Typography>
                    </Box>
                  }
                />

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={!selectedDocId || checkMutation.isPending}
                    startIcon={checkMutation.isPending
                      ? <CircularProgress size={18} color="inherit" />
                      : <SendOutlinedIcon />
                    }
                    onClick={() => checkMutation.mutate()}
                  >
                    {checkMutation.isPending
                      ? (useAi ? 'Kontrol ediliyor + AI açıklama…' : 'Kontrol ediliyor…')
                      : 'Aykırılık Kontrolü Başlat'}
                  </Button>
                  <Button variant="outlined" onClick={() => setActiveStep(0)}>
                    Geri
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Collapse>
        </Grid>

        {/* Sağ: MT Özet */}
        <Grid item xs={12} lg={5}>
          {parsedMt ? (
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  MT 700 Özet
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    { label: 'LC Referansı', value: parsedMt.referenceNumber },
                    { label: 'Tutar', value: parsedMt.lcAmount ? `${parsedMt.lcCurrency} ${parsedMt.lcAmount.toLocaleString()}` : undefined },
                    { label: 'Tolerans', value: parsedMt.tolerancePositive != null ? `+${parsedMt.tolerancePositive}% / -${parsedMt.toleranceNegative}%` : undefined },
                    { label: 'Son Geçerlilik', value: parsedMt.lcExpiryDate },
                    { label: 'Son Yükleme', value: parsedMt.latestShipmentDate },
                    { label: 'İbraz Süresi', value: parsedMt.presentationPeriodDays ? `${parsedMt.presentationPeriodDays} gün` : undefined },
                    { label: 'Kısmi Sevkiyat', value: parsedMt.partialShipments },
                    { label: 'Aktarma', value: parsedMt.transhipment },
                    { label: 'Yükleme Limanı', value: parsedMt.portOfLoading },
                    { label: 'Boşaltma Limanı', value: parsedMt.portOfDischarge },
                  ].map(({ label, value }) =>
                    value ? (
                      <Box key={label}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em">
                          {label}
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ mt: 0.25 }}>
                          {String(value)}
                        </Typography>
                        <Divider sx={{ mt: 1 }} />
                      </Box>
                    ) : null
                  )}
                </Box>

                {parsedMt.goodsDescription && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em">
                      Mal Tanımı (:45A:)
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                      {parsedMt.goodsDescription}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {parsedMt.fieldCount} alan ayrıştırıldı · MT ID: {parsedMt.id}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ bgcolor: 'action.hover' }}>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <DocumentScannerOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  MT 700 mesajını sol taraftaki alana yapıştırın ve "MT'yi Ayrıştır" butonuna tıklayın.
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                  :20: ile başlayan standart SWIFT formatı desteklenir.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MtKontrolPage;
