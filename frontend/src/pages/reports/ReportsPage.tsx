import React from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, Divider } from '@mui/material';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';

const ReportsPage = () => (
  <Box>
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" fontWeight={700}>Raporlar</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        İşleme geçmişi, hata istatistikleri ve doğrulama raporlarını oluşturun ve dışa aktarın.
      </Typography>
    </Box>
    <Grid container spacing={2.5}>
      {[
        { title: 'İşleme Geçmişi', desc: 'Belge yüklemeleri ve işleme sonuçlarının tam geçmişi.' },
        { title: 'Hata İstatistikleri', desc: 'Doğrulama başarısızlıkları ve sorun sıklıklarının dağılımı.' },
        { title: 'Doğrulama Raporu', desc: 'Tüm belgelere ait güven puanları ve sorun özetleri.' },
        { title: 'Kullanıcı Aktivitesi', desc: 'Kullanıcı işlemlerinin ve belge düzeltmelerinin denetim kaydı.' },
      ].map((r) => (
        <Grid item xs={12} sm={6} key={r.title}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <AssessmentOutlinedIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>{r.title}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>{r.desc}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon fontSize="small" />}>
                  PDF İndir
                </Button>
                <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon fontSize="small" />}>
                  Excel İndir
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default ReportsPage;
