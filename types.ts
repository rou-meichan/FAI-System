
export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  PENDING_AI = 'PENDING_AI',
  AI_REVIEWING = 'AI_REVIEWING',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DocType {
  ENGINEERING_DRAWING = 'Engineering Drawing',
  PROCESS_MANAGEMENT_PLAN = 'Process Management Plan',
  CLEANLINESS_REPORT = 'Cleanliness Report',
  FAI_REPORT_SUPPLIER = 'FAI Report (Supplier)',
  MATERIAL_CERT = 'Material Certification & CoC',
  ROHS_DECLARATION = 'RoHS Certification',
  PACKAGING_REQ = 'Packaging Requirements',
  REACH_COMPLIANCE = 'REACH Compliance',
  BOM = 'Bill of Materials',
}

export interface FAIFile {
  id: string;
  type: DocType;
  name: string;
  mimeType: string;
  lastModified: number;
  data?: string; // Base64 (still useful for local preview before submit)
  storagePath?: string; // Path in Supabase Storage
  url?: string; // Public URL
  isMandatory: boolean;
}

export interface FAISubmission {
  id: string;
  supplierName: string;
  partNumber: string;
  revision: string;
  timestamp: number;
  status: SubmissionStatus;
  files: FAIFile[];
  iqaRemarks?: string;
  isNewVerdict?: boolean;
  aiAnalysis?: {
    overallVerdict: 'APPROVED' | 'REJECTED';
    summary: string;
    details: {
      docType: DocType;
      result: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
      notes: string;
    }[];
  };
}

export type UserRole = 'SUPPLIER' | 'IQA';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  organization: string;
}

export interface SupplierAccount {
  id: string;
  name: string;
  organization: string;
  email: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  createdDate: number;
}

export interface EmployeeAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'DEACTIVATED';
  createdDate: number;
}
