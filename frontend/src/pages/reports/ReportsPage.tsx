import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, Divider, Chip, Alert } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { reportService } from '../../services/reportService';

interface ReportDef {
  title: string;
  desc: string;
  download?: () => Promise<void>;
}

const REPORTS: ReportDef[] = [
  {
    title: 'İşleme Geçmişi',
    desc: 'Belge yüklemeleri ve işleme sonuçlarının tam geçmişi.',
    download: reportService.downloadProcessingHistory,
  },
  {
    title: 'Doğrulama Raporu',
    desc: 'Tüm belgelere ait güven puanları ve sorun özetleri.',
    download: reportService.downloadValidationReport,
  },
  {
    title: 'Hata İstatistikleri',
    desc: 'Doğrulama başarısızlıkları ve sorun sıklıklarının dağılımı.',
  },
  {
    title: 'Kullanıcı Aktivitesi',
    desc: 'Kullanıcı işlemlerinin ve belge düzeltmelerinin denetim kaydı.',
  },
];

const ReportsPage = () => {
  const [downloadingTitle, setDownloadingTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (report: ReportDef) => {
    if (!report.download) return;
    setError(null);
    setDownloadingTitle(report.title);
    try {
      await report.download();
    } catch {
      setError(`${report.title} indirilemedi. Lütfen tekrar deneyin.`);
    } finally {
      setDownloadingTitle(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Raporlar</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          İşleme geçmişi, hata istatistikleri ve doğrulama raporlarını oluşturun ve dışa aktarın.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {REPORTS.map((r) => (
          <Grid item xs={12} sm={6} key={r.title}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <AssessmentOutlinedIcon color={r.download ? 'primary' : 'disabled'} />
                  <Typography variant="subtitle1" fontWeight={600}>{r.title}</Typography>
                  {!r.download && (
                    <Chip label="Yakında" size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>{r.desc}</Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadOutlinedIcon fontSize="small" />}
                    disabled={!r.download || downloadingTitle === r.title}
                    onClick={() => handleDownload(r)}
                  >
                    {downloadingTitle === r.title ? 'İndiriliyor…' : 'Excel İndir (CSV)'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsPage;
