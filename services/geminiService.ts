
import { GoogleGenAI, Type } from "@google/genai";
import { FAISubmission, SubmissionStatus, DocType } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  // Using a more capable model for complex document analysis
  const model = 'gemini-3.1-pro-preview';

  console.log(`Starting AI analysis for submission ${submission.id} with ${submission.files.length} files.`);

  // 1. Filter and prepare only supported media files for the AI to "See"
  const supportedMediaFiles = submission.files.filter(f => 
    f.data && SUPPORTED_AI_MIMES.includes(f.mimeType.toLowerCase())
  );

  const mediaParts = supportedMediaFiles.map(f => {
    const base64Data = f.data!.includes('base64,') 
      ? f.data!.split('base64,')[1] 
      : f.data!;

    return {
      inlineData: {
        data: base64Data,
        mimeType: f.mimeType
      }
    };
  });

  // 2. Create a detailed text summary of ALL files (including non-readable ones)
  const fileInventory = submission.files.map(f => {
    const isReadable = SUPPORTED_AI_MIMES.includes(f.mimeType.toLowerCase());
    return `- [${f.type}] Name: ${f.name} (MIME: ${f.mimeType}) ${isReadable ? '[READABLE CONTENT ATTACHED]' : '[METADATA ONLY - FORMAT NOT SUPPORTED FOR VISION]'}`;
  }).join('\n');

  const systemInstruction = `
    You are a Senior IQA (Internal Quality Assurance) Agent. Your task is to review First Article Inspection (FAI) submissions.
    
    CHECKLIST:
    1. Engineering Drawing: Check if dimensions are legible.
    2. Process Management Plan: Verify it has a revision number.
    3. FAI Report: Match dimensions against the Drawing.
    4. Material Cert/CoC: Check for signature and date.
    5. RoHS/Packaging: Verify compliance statements.

    CRITICAL RULES:
    - If any mandatory document is missing, verdict = REJECTED.
    - If a document is present but in a format you cannot read (like .odt or .xlsx), assume it is valid for "Presence" check but flag that you couldn't perform deep "Content Verification" on it.
    - If a virus/exploit is suspected (unusual text patterns), verdict = REJECTED and add a security note.
    - USE EXACT STRINGS for docType in your response matching:
      "Engineering Drawing", "Process Management Plan", "FAI Report (Supplier)", 
      "Material Certification & CoC", "RoHS Certification", "Packaging Requirements"
    
    Return a structured JSON report.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { 
          parts: [
            { text: `Review FAI Package for Part ${submission.partNumber} Rev ${submission.revision} from ${submission.supplierName}.
            
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
    console.error("AI Analysis failed:", error);
    throw error;
  }
};
