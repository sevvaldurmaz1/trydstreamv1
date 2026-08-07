import React from 'react';
import { Chip, type ChipProps } from '@mui/material';
import type { DocumentStatus, ValidationStatus, IssueSeverity } from '../../types';

// ─────────────────────────────────────────────────────────────────
// Generic Status Chip
// ─────────────────────────────────────────────────────────────────

type StatusValue = DocumentStatus | ValidationStatus | IssueSeverity;

const STATUS_CONFIG: Record<string, { label: string; color: ChipProps['color'] }> = {
  // DocumentStatus
  UPLOADED: { label: 'Yüklendi', color: 'default' },
  PROCESSING: { label: 'İşleniyor', color: 'info' },
  EXTRACTED: { label: 'Çıkarıldı', color: 'info' },
  VALIDATING: { label: 'Doğrulanıyor', color: 'warning' },
  VALIDATED: { label: 'Doğrulandı', color: 'success' },
  REJECTED: { label: 'Reddedildi', color: 'error' },
  REQUIRES_REVIEW: { label: 'İnceleme Gerekli', color: 'warning' },
  COMPLETED: { label: 'Tamamlandı', color: 'success' },
  // ValidationStatus
  PASSED: { label: 'Geçti', color: 'success' },
  FAILED: { label: 'Başarısız', color: 'error' },
  WARNING: { label: 'Uyarı', color: 'warning' },
  PENDING: { label: 'Bekliyor', color: 'default' },
  // IssueSeverity
  HIGH: { label: 'Yüksek', color: 'error' },
  MEDIUM: { label: 'Orta', color: 'warning' },
  LOW: { label: 'Düşük', color: 'info' },
};

interface StatusChipProps {
  status: StatusValue;
  size?: ChipProps['size'];
}

const StatusChip = ({ status, size = 'small' }: StatusChipProps) => {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' as const };
  return <Chip label={config.label} color={config.color} size={size} variant="outlined" />;
};

export default StatusChip;
