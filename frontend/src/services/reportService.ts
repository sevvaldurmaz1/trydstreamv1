import apiClient from './api';

const downloadFile = async (url: string, fallbackFilename: string) => {
  const res = await apiClient.get<Blob>(url, { responseType: 'blob' });

  const disposition = res.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallbackFilename;

  const blobUrl = window.URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const reportService = {
  downloadProcessingHistory: () => downloadFile('/reports/processing-history', 'islem-gecmisi.csv'),
  downloadValidationReport: () => downloadFile('/reports/validation-report', 'dogrulama-raporu.csv'),
};
