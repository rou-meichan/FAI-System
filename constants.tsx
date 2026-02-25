
import { DocType } from './types';

export const DOCUMENT_CONFIG = [
  { type: DocType.ENGINEERING_DRAWING, mandatory: true, description: 'Including annotation/numbering of features' },
  { type: DocType.PROCESS_MANAGEMENT_PLAN, mandatory: true, description: 'Full manufacturing process flow' },
  { type: DocType.FAI_REPORT_SUPPLIER, mandatory: true, description: 'Initial measurement data' },
  { type: DocType.MATERIAL_CERT, mandatory: true, description: 'Material Certification and CoC' },
  { type: DocType.ROHS_DECLARATION, mandatory: true, description: 'RoHS Compliance status' },
  { type: DocType.PACKAGING_REQ, mandatory: true, description: 'Defined requirements for shipping' },
  { type: DocType.CLEANLINESS_REPORT, mandatory: false, description: 'IC, NVR, FTIR, Flatness (When required)' },
  { type: DocType.REACH_COMPLIANCE, mandatory: false, description: 'REACH Compliance status (If applicable)' },
  { type: DocType.BOM, mandatory: false, description: 'Bill of Materials List (If applicable)' },
];
