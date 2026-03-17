
import { GoogleGenAI, Type } from "@google/genai";
import { FAISubmission, SubmissionStatus, DocType } from "../types";
import { getFileUrl } from "./storageService";

let aiInstance: any = null;

export const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const apiKey = process.env.GEMINI_API_KEY || 'placeholder';
  try {
    aiInstance = new GoogleGenAI({ apiKey });
    return aiInstance;
  } catch (err) {
    console.error('Failed to initialize Gemini AI:', err);
    return {
      models: {
        generateContent: async () => ({ text: '{}' }),
      }
    };
  }
};

const ai = getAI();

/**
 * Gemini supported MIME types for multimodal input (inlineData)
 * as of current documentation.
 */
const SUPPORTED_AI_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif'
];

export const analyzeFAISubmission = async (submission: FAISubmission): Promise<any> => {
  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
  
  console.log(`Starting AI analysis for submission ${submission.id} with ${submission.files.length} files.`);

  // 1. Filter and prepare only supported media files for the AI to "See"
  const supportedMediaFiles = submission.files.filter(f => 
    (f.data || f.url || f.storagePath) && SUPPORTED_AI_MIMES.includes(f.mimeType.toLowerCase())
  );

  const mediaParts = (await Promise.all(supportedMediaFiles.map(async (f) => {
    let base64Data = '';
    
    try {
      if (f.data) {
        base64Data = f.data.includes('base64,') 
          ? f.data.split('base64,')[1] 
          : f.data;
      } else if (f.storagePath || f.url) {
        const fileUrl = f.storagePath ? await getFileUrl(f.storagePath) : f.url;
        if (!fileUrl) throw new Error("No valid URL found for file");
        
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const blob = await response.blob();
        
        // Use FileReader for more robust base64 conversion
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // result is "data:mime/type;base64,......"
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (err) {
      console.warn(`Skipping file ${f.name} for AI analysis (fetch/process failed):`, err instanceof Error ? err.message : String(err));
      return null;
    }

    if (!base64Data) {
      console.warn(`Skipping file ${f.name} due to empty data`);
      return null;
    }

    return {
      inlineData: {
        data: base64Data,
        mimeType: f.mimeType
      }
    };
  }))).filter((part): part is { inlineData: { data: string; mimeType: string } } => part !== null);

  // 2. Create a detailed text summary of ALL files (including non-readable ones)
  const fileInventory = submission.files.map(f => {
    const isReadable = SUPPORTED_AI_MIMES.includes(f.mimeType.toLowerCase());
    return `- [${f.type}] Name: ${f.name} (MIME: ${f.mimeType}) ${isReadable ? '[READABLE CONTENT ATTACHED]' : '[METADATA ONLY - FORMAT NOT SUPPORTED FOR VISION]'}`;
  }).join('\n');

  const systemInstruction = ` 
  Senior IQA Agent System Prompt
  Role: You are a Senior Internal Quality Assurance (IQA) Agent for Vitrox Technologies. Your primary objective is to audit First Article Inspection (FAI) submissions from suppliers to ensure total compliance with corporate quality standards.

  Objective: Audit only submitted files; do not report on missing document types. Verify each file against specific criteria and the General Audit Rules. Any failed mandatory requirement results in a REJECTED verdict for that file. Your JSON output must contain entries only for the files provided.

  1. GENERAL AUDIT RULES (Appliclies to All Documents)
  - Before performing any checks, you must first identify the document type. If a document is identified as a type not requested (e.g., an Invoice or a duplicate of another file) or cannot be categorized into the 7 defined types, report: "REJECTED: Incorrect document type." * Action: Do not perform any further General or Specific checks for that file.

  -Core Part Number Validation: Search for the Part Number. Use Fuzzy Matching: Only the "Core Identifier" (e.g., 4SJGTY-N320) must match. Ignore prefixes (e.g., FS-, FH-) and suffixes/revisions (e.g., -01, -P00). If the core sequence is found, it is a MATCH.

  - Audit Every Row: You must verify that every row within these columns (Signature, Name, Designation, and Date) contains data. If any single field in a supplier column is blank, you must report: "The approval section is incomplete."

  - Data Consistency: Ensure the Part Name and Revision match the FAI submission metadata.Customer Approval fields.

  - Omit, Don't Label: If a document type (like the BOM) is not required or was not submitted, you must completely exclude that object from the audit_details array.

  - Verdict Limitation: You must use only PASS or FAIL for the final verdict of each document.

  2. DOCUMENT-SPECIFIC REQUIREMENTS
  I. Engineering Drawing:
  - Verify General Audit Rules first.

  - Technical Integrity: Verify the document is a professional engineering schematic. It must contain essential technical specifications such as Units of Measure and Material requirements.

  - Legibility: Ensure the drawing resolution and contrast are sufficient to read all dimensions, notes, and symbols clearly.

  - Authorization: The drawing must have a Mill Stamp or an Authorized Signature/Inspector Mark.

  II. Process Management Plan (PMP) / Process Flow:
  - Verify General Audit Rules first.

  - Sequential Logic: Review the operational steps to ensure a logical manufacturing flow (e.g., Material Procurement → Machining → Inspection → Packaging).

  - Critical Controls: Reject the submission if major quality control stages (like final inspection) are missing.

  III. FAI Report (Supplier):  
  - Verify General Audit Rules first.

  - Measurement Validation: Conduct a line-by-line audit of the Actual Measurement column against the Minimum and Maximum tolerances. Rule: If any actual value falls outside the specified range, the verdict is REJECTED.

  - Tolerance Integrity: All dimensions must have numeric tolerances. If cells contain #N/A, #VALUE!, or are empty, you must state: "The following item numbers lack valid numeric tolerance values: [List all item numbers]."

  - Specific Instruction: Explicitly state: "The following item numbers lack valid numeric tolerance values: [List all item numbers]."

  - Final Disposition: The report must conclude with an explicit "Pass," "Accepted," or "OK" status.

  IV. Material Certification:
  - Verify General Audit Rules first.

  - Grade Verification: The material grade must be explicitly identified as S50C or S45Cr. Rule: Any other grade (e.g., S45C, SS400) requires an immediate REJECTED verdict.

  - Flexibility: If the grade name has a minor typo but the Carbon (C) content is 0.47%-0.55%, consider it a PASS but note the typo.

  - Heat Number: You must find and extract the Heat Number. If missing, report: "Missing Heat Number for traceability.

  - Chemical Analysis: Ensure a table of elements (C, Si, Mn, P, S) is present with numeric values.

  - Authorization: The certificate must have a Mill Stamp or an Authorized Signature/Inspector Mark.

  V. Packaging Requirements:
  - Verify General Audit Rules first.

  - Method & Protection: Confirm the document explicitly defines the physical protection method (e.g., "White foam," "Wrapping," "Wooden box," or "Bubble wrap").

  - Identification & Marking: Must mention at least one form of marking (e.g., "Labeling," "Tagging," or "Dot marking").

  VI. RoHS Certification:  
  - Verify General Audit Rules first.

  - Compliance Declaration: Verify that the document contains a positive statement of compliance (e.g., "YES," "Compliant," "Pass," or "Conform"). The document should reference a specific RoHS directive (e.g., "2011/65/EU" or "(EU) 2015/863").

  - Material Link: Ensure the material description listed on the RoHS cert (e.g., "Mild Steel" or "S50C") is consistent with the Material Certification provided.

  - Authorization: Must have a company stamp (chop) or signature.

  VII. Bill Of Material List (BOM)
  - Verify General Audit Rules first.
  
  - Assembly Detection: Analyze the Engineering Drawing and PMP for assembly indicators such as "Assembly/Sub-assy" text, parts lists, or process steps like "Press-fit" and "Join."

  - Mandatory Presence: If an assembly is detected, a BOM document is MANDATORY; if missing, report: "Part is identified as an assembly, but no Bill of Material (BOM) document was submitted."

  - Conditional Reporting: Include BOM audit details in the JSON only if an assembly is detected. If the part is identified as a single component, you MUST NOT include a BOM entry, comment, or status in the JSON output.

  3. COMMUNICATION & OUTPUT FORMAT
  - Use Simple English: You must use plain, professional English that is easy for any user to understand.

  - Avoid Jargon: Do not use technical or internal phrases like "Document integrity," "Legibility is satisfactory," or "Triple-match."

  - Describe the Visuals: Instead of naming the rule, describe the visual result. (e.g., "The supplier's approval stamp/signature was found.")

  - Explain Rejections: You must always explain why a document is rejected by comparing the found value against the expected value.

  - Highlight Mismatches: If a part number or revision does not match, you must clearly state both the value found on the document and the value required by the request.

  3. REQUIRED JSON OUTPUT
  Return ONLY a valid JSON object in a structural format.
  `;

  for (const model of models) {
    try {
      console.log(`Attempting analysis with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          { 
            parts: [
              { text: `Review FAI Package for Part Number ${submission.id} (Part Name: ${submission.partName}) Rev ${submission.revision} from ${submission.supplierName}.
              
              SUBMISSION INVENTORY:
              ${fileInventory}
              
              Note: Only PDF and Image formats have been attached as raw data. For other formats, please rely on the inventory list to confirm presence.` },
              ...mediaParts 
            ]
          }
        ],
        config: {
          systemInstruction,
          thinkingConfig: {
              thinkingBudget: 16000 
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallVerdict: { type: Type.STRING, description: 'APPROVED or REJECTED' },
              summary: { type: Type.STRING, description: 'Justification' },
              details: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    docType: { type: Type.STRING },
                    result: { type: Type.STRING, description: 'PASS, FAIL, or NOT_APPLICABLE' },
                    notes: { type: Type.STRING }
                  },
                  required: ['docType', 'result', 'notes']
                }
              }
            },
            required: ['overallVerdict', 'summary', 'details']
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error(`AI Analysis failed with model ${model}:`, error);
      // Continue to next model
    }
  }

  throw new Error("All AI models failed to analyze the submission.");
};
