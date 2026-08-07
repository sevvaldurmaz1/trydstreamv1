// ─────────────────────────────────────────────────────────────────
// Document & Trade Finance Types
// ─────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EXTRACTED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'REJECTED'
  | 'REQUIRES_REVIEW'
  | 'COMPLETED';

export type ValidationStatus = 'PASSED' | 'FAILED' | 'WARNING' | 'PENDING';

export type IssueSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type IssueType =
  | 'MISSING_FIELD'
  | 'INVALID_DATE'
  | 'CURRENCY_MISMATCH'
  | 'INVOICE_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'DOCUMENT_INCONSISTENCY'
  | 'UNKNOWN_FORMAT';

export interface DocumentType {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface Document {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  documentType: DocumentType | null;
  uploadedBy: string;
  uploadedAt: string;
  processedAt: string | null;
  extractedFieldCount: number;
  validationScore: number | null;
}

export interface ExtractedField {
  id: number;
  documentId: number;
  fieldName: string;
  fieldValue: string | null;
  confidenceScore: number;
  isValidated: boolean;
  isCorrected: boolean;
  correctedValue: string | null;
}

export interface ValidationIssue {
  id: number;
  issueType: IssueType;
  severity: IssueSeverity;
  fieldName: string | null;
  description: string;
  isResolved: boolean;
}

export interface ValidationResult {
  id: number;
  documentId: number;
  overallStatus: ValidationStatus;
  confidenceScore: number;
  validatedAt: string;
  notes: string | null;
  issues: ValidationIssue[];
}

// ── Dashboard ───────────────────────────────────────────────────

export interface DashboardStats {
  totalDocuments: number;
  processingToday: number;
  validationSuccessRate: number;
  pendingReview: number;
  documentsThisWeek: number[];
  statusBreakdown: Record<DocumentStatus, number>;
  recentDocuments: Document[];
}
