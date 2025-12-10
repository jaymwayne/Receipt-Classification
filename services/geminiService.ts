import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, ReceiptItem, Assignments } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-pro-preview';

/**
 * Parses a receipt image to extract items and prices.
 */
export const parseReceiptImage = async (base64Image: string, mimeType: string): Promise<ReceiptData> => {
  const prompt = `
    Analyze this receipt image. Extract all line items with their individual prices.
    Also extract the subtotal, tax, and total amount.
    If there is a gratuity or tip included in the receipt, extract that too, otherwise set tip to 0.
    Ignore payment info lines like "VISA ****".
    Return the result as a structured JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                },
              },
            },
            subtotal: { type: Type.NUMBER },
            tax: { type: Type.NUMBER },
            tip: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
          },
          required: ["items", "subtotal", "tax", "total"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No text returned from Gemini");

    const data = JSON.parse(text);
    
    // Add IDs to items
    const itemsWithIds = data.items.map((item: any, index: number) => ({
      ...item,
      id: `item-${index}`,
    }));

    return {
      items: itemsWithIds,
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      tip: data.tip || 0,
      total: data.total || 0,
    };

  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw error;
  }
};

/**
 * Processes a natural language command to update bill assignments.
 */
export const processSplitCommand = async (
  command: string,
  receiptData: ReceiptData,
  currentAssignments: Assignments
): Promise<{ assignments: Assignments; reply: string }> => {
  
  const systemPrompt = `
    You are a helpful bill splitting assistant.
    You have a list of receipt items and current assignments.
    The user will send messages like "Tom had the burger" or "Alice and Bob shared the pizza".
    
    Your goal is to update the 'assignments' map based on the user's intent.
    
    Rules for assignments:
    1. 'assignments' is a map where Key = item ID, Value = object mapping Person Name to Share (0.0 to 1.0).
    2. If one person pays for an item, their share is 1.0.
    3. If multiple people share, distribute the shares (e.g., 2 people = 0.5 each).
    4. If a user says "reset the burger", remove assignments for that item.
    5. Always be friendly in your 'reply'.
    6. Match items intelligently based on the name. If ambiguous, make your best guess or ask for clarification in the 'reply' (but try to guess first).
    
    Current Receipt Items:
    ${JSON.stringify(receiptData.items)}

    Current Assignments:
    ${JSON.stringify(currentAssignments)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: command,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedAssignments: {
              type: Type.OBJECT,
              description: "The COMPLETE updated state of assignments. Copy over existing assignments if they haven't changed, unless you are modifying them.",
              nullable: true, 
              // Note: Defining a purely dynamic map in strict schema can be tricky.
              // We will rely on the model to return a JSON object that matches the structure:
              // { "item-0": { "Alice": 1.0 }, "item-1": { "Bob": 0.5, "Charlie": 0.5 } }
              // Since strict schema for dynamic keys is complex, we'll try a looser definition or just trust the model with a simpler schema if this fails.
              // Strategy: Let's ask for an array of operations instead, it's safer for schemas.
            },
            reply: { type: Type.STRING },
          },
        },
      },
    });

    // Strategy change: To ensure schema compliance and robustness, let's ask for a list of updates 
    // instead of the whole map if the dynamic map schema is too rigid.
    // However, since we are using 'gemini-3-pro-preview', it handles JSON reasonably well.
    // Let's refine the schema to be array-based updates to reconstruct the map client-side if needed?
    // Actually, let's try a different approach: Just ask for the new assignment state as a free-form object inside the JSON string 
    // by NOT specifying the deep properties of 'updatedAssignments', just saying it's an OBJECT.
    // NOTE: In strict mode, OBJECT must have properties.
    // Workaround: We will use a defined schema for "AssignmentOperation" and apply it client side.
  } catch (e) {
    // If strict schema fails or is too complex, fallback to standard generation with instruction
    // This is often more robust for dynamic keys.
  }
  
  // Re-implementation with a robust schema structure
  const robustSchema = {
    type: Type.OBJECT,
    properties: {
      operations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            itemId: { type: Type.STRING },
            people: { 
              type: Type.ARRAY,
              items: { type: Type.STRING } 
            },
            action: { type: Type.STRING, enum: ["assign", "clear"] }
          }
        }
      },
      reply: { type: Type.STRING }
    }
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: command,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: robustSchema,
    },
  });

  const parsed = JSON.parse(response.text || "{}");
  
  // Apply operations to a copy of current assignments
  const newAssignments: Assignments = JSON.parse(JSON.stringify(currentAssignments));

  if (parsed.operations) {
    parsed.operations.forEach((op: any) => {
      if (op.action === 'clear') {
        delete newAssignments[op.itemId];
      } else if (op.action === 'assign' && op.people && op.people.length > 0) {
        const share = 1.0 / op.people.length;
        newAssignments[op.itemId] = {};
        op.people.forEach((person: string) => {
          newAssignments[op.itemId][person] = share;
        });
      }
    });
  }

  return {
    assignments: newAssignments,
    reply: parsed.reply || "Done.",
  };
};
