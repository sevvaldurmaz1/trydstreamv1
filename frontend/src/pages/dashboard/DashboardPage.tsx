import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { documentService } from '../../services/documentService';
import StatusChip from '../../components/common/StatusChip';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

// ─── Metric Card ─────────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  loading?: boolean;
}

const MetricCard = ({ title, value, subtitle, trend, loading }: MetricCardProps) => (
  <Card>
    <CardContent sx={{ p: 2.5 }}>
      {loading ? (
        <>
          <Skeleton width={100} height={14} sx={{ mb: 1 }} />
          <Skeleton width={60} height={36} />
        </>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" fontWeight={500} textTransform="uppercase" letterSpacing="0.08em">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, mb: 0.25 }}>
            {value}
          </Typography>
          {(subtitle || trend !== undefined) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend !== undefined && (
                <ArrowUpwardIcon
                  sx={{
                    fontSize: 14,
                    color: trend >= 0 ? 'success.main' : 'error.main',
                    transform: trend < 0 ? 'rotate(180deg)' : 'none',
                  }}
                />
              )}
              <Typography variant="caption" color={trend !== undefined && trend >= 0 ? 'success.main' : 'text.secondary'}>
                {trend !== undefined ? `${Math.abs(trend)}% geçen haftaya göre` : subtitle}
              </Typography>
            </Box>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

// ─── Dashboard Page ───────────────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const theme = useTheme();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => documentService.getDashboardStats(),
    refetchInterval: 30_000,
  });

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const chartData = weekDays.map((day, i) => ({
    day,
    documents: stats?.documentsThisWeek?.[i] ?? 0,
  }));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {getGreeting()}, {user?.firstName} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {format(new Date(), "EEEE, d MMMM yyyy")} · Bugün neler olduğuna bir bakın.
        </Typography>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Toplam Belge', value: stats?.totalDocuments ?? 0, trend: 12 },
          { title: 'Bugün İşlenen', value: stats?.processingToday ?? 0 },
          { title: 'Doğrulama Oranı', value: `${stats?.validationSuccessRate ?? 0}%`, trend: 3 },
          { title: 'İnceleme Bekleyen', value: stats?.pendingReview ?? 0 },
        ].map((m) => (
          <Grid item xs={12} sm={6} lg={3} key={m.title}>
            <MetricCard {...m} loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        {/* Weekly Activity Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Belge Aktivitesi
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bu hafta
                  </Typography>
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="documents"
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    fill="url(#colorDocs)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Breakdown */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Durum Dağılımı
              </Typography>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={36} sx={{ mb: 1 }} />)
                : Object.entries(stats?.statusBreakdown ?? {}).map(([status, count]) => (
                    <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <StatusChip status={status as never} />
                      <Typography variant="body2" fontWeight={600}>
                        {count}
                      </Typography>
                    </Box>
                  ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Documents */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Son Belgeler
                </Typography>
                <Button component={Link} to="/documents" size="small" endIcon={<OpenInNewIcon fontSize="small" />}>
                  Tümünü Gör
                </Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Dosya Adı</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell>Doğrulama Puanı</TableCell>
                    <TableCell>Yüklenme</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <TableCell key={j}><Skeleton /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : (stats?.recentDocuments ?? []).map((doc) => (
                        <TableRow key={doc.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 240 }}>
                              {doc.fileName}
                            </Typography>
                          </TableCell>
                          <TableCell><StatusChip status={doc.status} /></TableCell>
                          <TableCell>
                            <Typography variant="body2" color={doc.validationScore != null && doc.validationScore >= 80 ? 'success.main' : 'warning.main'} fontWeight={600}>
                              {doc.validationScore != null ? `${doc.validationScore}%` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {format(new Date(doc.uploadedAt), 'MMM d, HH:mm')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Button component={Link} to={`/documents/${doc.id}/review`} size="small">
                              İncele
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Günaydın';
  if (h < 17) return 'İyi günler';
  return 'İyi akşamlar';
};

export default DashboardPage;
