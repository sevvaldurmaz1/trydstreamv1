import apiClient from './api';
import type { ApiResponse } from '../types';
import type { MtMessage, DiscrepancyReport } from '../types/mt';

// ── MT Mesajları ──────────────────────────────────────────────────

export const mtService = {
  /** MT 700 metnini ayrıştır ve kaydet */
  parseMt: async (rawText: string, documentId?: number): Promise<MtMessage> => {
    const res = await apiClient.post<ApiResponse<MtMessage>>('/mt/parse', {
      rawText,
      documentId,
    });
    return res.data.data;
  },

  /** Kullanıcının MT mesajlarını listele */
  listMtMessages: async (): Promise<MtMessage[]> => {
    const res = await apiClient.get<ApiResponse<MtMessage[]>>('/mt');
    return res.data.data;
  },

  /** MT mesajı detayı */
  getMtById: async (id: number): Promise<MtMessage> => {
    const res = await apiClient.get<ApiResponse<MtMessage>>(`/mt/${id}`);
    return res.data.data;
  },

  /** Varolan MT mesajını düzenle ve yeniden ayrıştır */
  updateMt: async (id: number, rawText: string): Promise<MtMessage> => {
    const res = await apiClient.put<ApiResponse<MtMessage>>(`/mt/${id}`, { rawText });
    return res.data.data;
  },

  // ── Aykırılık Kontrolleri ──────────────────────────────────────

  /** MT ve belge arasında aykırılık kontrolü yap */
  checkDiscrepancy: async (params: {
    mtId: number;
    documentId: number;
    documentType?: string;
    useAi?: boolean;
    presentationDate?: string;
  }): Promise<DiscrepancyReport> => {
    const res = await apiClient.post<ApiResponse<DiscrepancyReport>>(
      '/discrepancy/check',
      {
        mtId: params.mtId,
        documentId: params.documentId,
        documentType: params.documentType ?? 'FATURA',
        useAi: params.useAi ?? false,
        presentationDate: params.presentationDate,
      },
      // AI açıklaması her bulgu için sırayla Ollama'ya soruluyor (paralelleştirme
      // yardımcı olmuyor - Ollama tek modeli tek seferde bir isteğe hizmet ediyor).
      // Kural sayısı arttıkça (artık 19'a kadar) toplam süre uzayabiliyor.
      { timeout: 300_000 },
    );
    return res.data.data;
  },

  /** Kullanıcının aykırılık raporlarını listele */
  listReports: async (): Promise<DiscrepancyReport[]> => {
    const res = await apiClient.get<ApiResponse<DiscrepancyReport[]>>('/discrepancy');
    return res.data.data;
  },

  /** Rapor detayı */
  getReportById: async (id: number): Promise<DiscrepancyReport> => {
    const res = await apiClient.get<ApiResponse<DiscrepancyReport>>(`/discrepancy/${id}`);
    return res.data.data;
  },
};
