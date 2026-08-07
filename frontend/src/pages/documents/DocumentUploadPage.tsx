import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Alert,
  useTheme,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { documentService } from '../../services/documentService';

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  documentId?: number;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/tiff': ['.tiff', '.tif'],
};

const DocumentUploadPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
  });

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    setIsUploading(true);
    const pending = uploadFiles.filter((f) => f.status === 'pending');

    for (let i = 0; i < pending.length; i++) {
      const uf = pending[i];
      const globalIdx = uploadFiles.indexOf(uf);

      setUploadFiles((prev) =>
        prev.map((f, idx) => (idx === globalIdx ? { ...f, status: 'uploading' } : f)),
      );

      try {
        const doc = await documentService.uploadDocument(uf.file, undefined, (pct) => {
          setUploadFiles((prev) =>
            prev.map((f, idx) => (idx === globalIdx ? { ...f, progress: pct } : f)),
          );
        });

        setUploadFiles((prev) =>
          prev.map((f, idx) =>
            idx === globalIdx ? { ...f, status: 'done', progress: 100, documentId: doc.id } : f,
          ),
        );
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Upload failed';
        setUploadFiles((prev) =>
          prev.map((f, idx) => (idx === globalIdx ? { ...f, status: 'error', error: msg } : f)),
        );
      }
    }

    setIsUploading(false);
  };

  const hasPending = uploadFiles.some((f) => f.status === 'pending');
  const firstDone = uploadFiles.find((f) => f.status === 'done');

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Belge Yükle
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Yapay zeka destekli OCR çıkarma ve doğrulama için ticaret finansmanı belgelerini yükleyin.
        </Typography>
      </Box>

      {/* Drop Zone */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            {...getRootProps()}
            sx={{
              border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
              borderRadius: 3,
              p: { xs: 4, sm: 8 },
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive
                ? theme.palette.mode === 'dark'
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(37,99,235,0.04)'
                : 'transparent',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor:
                  theme.palette.mode === 'dark'
                    ? 'rgba(59,130,246,0.05)'
                    : 'rgba(37,99,235,0.02)',
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadOutlinedIcon
              sx={{ fontSize: 48, color: isDragActive ? 'primary.main' : 'text.secondary', mb: 2 }}
            />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {isDragActive ? 'Dosyaları buraya bırakın' : 'Dosyaları sürükleyip bırakın'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              veya seçmek için tıklayın
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Desteklenen: PDF, PNG, JPG, TIFF · Dosya başına maks. 50MB · 10 dosyaya kadar
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              Dosyalar ({uploadFiles.length})
            </Typography>
            <List dense disablePadding>
              {uploadFiles.map((uf, idx) => (
                <ListItem
                  key={idx}
                  disablePadding
                  sx={{
                    mb: 1,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                  }}
                  secondaryAction={
                    uf.status === 'pending' && (
                      <IconButton size="small" onClick={() => removeFile(idx)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {uf.status === 'done' ? (
                      <CheckCircleOutlinedIcon fontSize="small" color="success" />
                    ) : uf.status === 'error' ? (
                      <ErrorOutlineIcon fontSize="small" color="error" />
                    ) : (
                      <InsertDriveFileOutlinedIcon fontSize="small" color="action" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {uf.file.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {(uf.file.size / 1024 / 1024).toFixed(2)} MB
                          {uf.error && ` · ${uf.error}`}
                        </Typography>
                        {uf.status === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={uf.progress}
                            sx={{ mt: 0.5, borderRadius: 4, height: 4 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {uploadFiles.some((f) => f.status === 'error') && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Bazı dosyalar yüklenemedi. Lütfen tekrar deneyin.
        </Alert>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          disabled={!hasPending || isUploading}
          onClick={uploadAll}
        >
          {isUploading ? 'Yükleniyor…' : `${uploadFiles.filter((f) => f.status === 'pending').length} Dosyayı Yükle`}
        </Button>
        {firstDone && (
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate(`/documents/${firstDone.documentId}/review`)}
          >
            İlk Yüklemeyi İncele
          </Button>
        )}
        <Button variant="text" size="large" onClick={() => navigate('/documents')}>
          İptal
        </Button>
      </Box>
    </Box>
  );
};

export default DocumentUploadPage;
