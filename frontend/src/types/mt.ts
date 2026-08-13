export interface MtMessage {
  id: number;
  mtType: string;
  referenceNumber?: string;
  lcExpiryDate?: string;
  lcAmount?: number;
  lcCurrency?: string;
  tolerancePositive?: number;
  toleranceNegative?: number;
  applicant?: string;
  beneficiary?: string;
  goodsDescription?: string;
  documentsRequired?: string;
  latestShipmentDate?: string;
  presentationPeriodDays?: number;
  partialShipments?: string;
  transhipment?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  applicableRules?: string;
  fieldCount: number;
  createdAt: string;
}

export interface DiscrepancyFinding {
  id?: number;
  ruleCode: string;
  findingType: 'R' | 'O';
  fieldName: string;
  description: string;
  mtValue?: string;
  documentValue?: string;
  isbpReference?: string;
  ucpReference?: string;
  aiExplanation?: string;
  isWaived?: boolean;
}

export interface DiscrepancyReport {
  id?: number;
  mtMessageId?: number;
  mtReference?: string;
  documentId?: number;
  documentFileName?: string;
  overallResult: 'CLEAN' | 'DISCREPANT' | 'PENDING';
  totalFindings: number;
  mandatoryFindings: number;
  optionalFindings: number;
  checkedAt?: string;
  notes?: string;
  aiAvailable?: boolean;
  findings: DiscrepancyFinding[];
}

export interface Mt799Message {
  id: number;
  mt700Id?: number;
  mt700Reference?: string;
  referenceNumber?: string;
  senderBic?: string;
  receiverBic?: string;
  subject?: string;
  messageText: string;
  direction: 'INCOMING' | 'OUTGOING';
  createdAt: string;
}

export interface Mt745Claim {
  id: number;
  mt700Id?: number;
  mt700Reference?: string;
  referenceNumber?: string;
  claimingBank: string;
  reimbursingBank?: string;
  currency: string;
  amount: number;
  valueDate?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
