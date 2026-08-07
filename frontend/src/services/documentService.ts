import apiClient from './api';
import type {
  ApiResponse,
  PagedResponse,
  Document,
  ExtractedField,
  ValidationResult,
  DashboardStats,
  FilterParams,
} from '../types';

// ─────────────────────────────────────────────────────────────────
// Document Service
// ─────────────────────────────────────────────────────────────────

export const documentService = {
  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return res.data.data;
  },

  // Documents list with filtering & pagination
  async getDocuments(params: FilterParams = {}): Promise<PagedResponse<Document>> {
    const res = await apiClient.get<ApiResponse<PagedResponse<Document>>>('/documents', { params });
    return res.data.data;
  },

  // Single document
  async getDocument(id: number): Promise<Document> {
    const res = await apiClient.get<ApiResponse<Document>>(`/documents/${id}`);
    return res.data.data;
  },

  // Upload document (multipart/form-data)
  async uploadDocument(
    file: File,
    documentTypeId?: number,
    onProgress?: (pct: number) => void,
  ): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    if (documentTypeId) formData.append('documentTypeId', String(documentTypeId));

    const res = await apiClient.post<ApiResponse<Document>>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return res.data.data;
  },

  // Extracted fields
  async getExtractedFields(documentId: number): Promise<ExtractedField[]> {
    const res = await apiClient.get<ApiResponse<ExtractedField[]>>(
      `/documents/${documentId}/extracted-fields`,
    );
    return res.data.data;
  },

  // Correct a field value
  async correctField(
    documentId: number,
    fieldId: number,
    correctedValue: string,
  ): Promise<ExtractedField> {
    const res = await apiClient.put<ApiResponse<ExtractedField>>(
      `/documents/${documentId}/fields/${fieldId}`,
      { correctedValue },
    );
    return res.data.data;
  },

  // Validation result
  async getValidationResult(documentId: number): Promise<ValidationResult> {
    const res = await apiClient.get<ApiResponse<ValidationResult>>(
      `/documents/${documentId}/validation`,
    );
    return res.data.data;
  },

  // Trigger manual validation
  async triggerValidation(documentId: number): Promise<ValidationResult> {
    const res = await apiClient.post<ApiResponse<ValidationResult>>(
      `/documents/${documentId}/validate`,
    );
    return res.data.data;
  },

  // Delete document
  async deleteDocument(documentId: number): Promise<void> {
    await apiClient.delete(`/documents/${documentId}`);
  },
};
