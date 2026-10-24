import { localApiOnly } from './local-api-guard.mjs';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

async function startServer() {
  const app = express();
app.use('/api', localApiOnly(() => PORT));

  // Increase payload limit for base64 receipt photos
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Analyze receipt image endpoint
  app.post("/api/receipt/analyze", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Clean base64 string if it contains data URI prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
      const ai = getGenAI();

      const prompt = `Analyze this restaurant or store receipt photo in detail.
Extract all line items, their individual prices, quantities, subtotal, tax amount, tip (if already written or 0), and grand total.
If an item has a quantity greater than 1 with a combined price, represent it clearly.
Normalize prices as positive floating point numbers.
Identify the restaurant or merchant name if visible, or provide a reasonable name.
Identify currency symbol (e.g. '$', '€', '£', default '$').`;

      // Try gemini-3.1-pro-preview first as specified in requirements, fallback to gemini-3.5-flash
      const candidateModels = ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-3.8-flash"];
      let lastError: unknown = null;
      let rawText = "";

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: cleanBase64,
                  },
                },
                { text: prompt },
              ],
            },
            config: {
              systemInstruction: "You are a precise receipt OCR and billing parsing engine. You extract itemized lists from receipts into structured JSON.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  restaurantName: { type: Type.STRING, description: "Name of the restaurant or store" },
                  date: { type: Type.STRING, description: "Date or time of transaction if present" },
                  currency: { type: Type.STRING, description: "Currency symbol, e.g. '$'" },
                  items: {
                    type: Type.ARRAY,
                    description: "List of itemized goods or dishes",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "Description of the food item or drink" },
                        price: { type: Type.NUMBER, description: "Total price for this line item" },
                        quantity: { type: Type.NUMBER, description: "Quantity ordered, default 1" },
                      },
                      required: ["name", "price"],
                    },
                  },
                  subtotal: { type: Type.NUMBER, description: "Pre-tax items subtotal" },
                  tax: { type: Type.NUMBER, description: "Tax amount" },
                  tip: { type: Type.NUMBER, description: "Tip amount if printed or written, otherwise 0" },
                  total: { type: Type.NUMBER, description: "Final grand total" },
                },
                required: ["items", "subtotal", "tax", "total"],
              },
            },
          });

          rawText = response.text || "";
          if (rawText) {
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`Model ${modelName} receipt analysis attempt failed, trying next fallback:`, err);
        }
      }

      if (!rawText) {
        throw lastError || new Error("Failed to extract receipt text with Gemini models");
      }

      const parsed = JSON.parse(rawText);

      // Structure items with unique IDs and empty assignedTo lists
      const items = (parsed.items || []).map((item: { name: string; price: number; quantity?: number }, idx: number) => ({
        id: `parsed-${Date.now()}-${idx + 1}`,
        name: item.name || `Item ${idx + 1}`,
        price: typeof item.price === "number" ? Math.max(0, item.price) : 0,
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
        assignedTo: [],
      }));

      // Calculate fallback subtotal if needed
      const itemsSum = items.reduce((acc: number, cur: { price: number }) => acc + cur.price, 0);
      const subtotal = typeof parsed.subtotal === "number" && parsed.subtotal > 0 ? parsed.subtotal : itemsSum;
      const tax = typeof parsed.tax === "number" ? parsed.tax : Math.round(subtotal * 0.08875 * 100) / 100;
      const tip = typeof parsed.tip === "number" ? parsed.tip : 0;
      const total = typeof parsed.total === "number" && parsed.total > 0 ? parsed.total : subtotal + tax + tip;

      return res.json({
        id: `receipt-${Date.now()}`,
        restaurantName: parsed.restaurantName || "Receipt",
        date: parsed.date || new Date().toLocaleDateString(),
        currency: parsed.currency || "$",
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        tip: Math.round(tip * 100) / 100,
        tipPercent: subtotal > 0 ? Math.round((tip / subtotal) * 100) : 0,
        total: Math.round(total * 100) / 100,
      });
    } catch (error: unknown) {
      console.error("Receipt analysis error:", error);
      const message = error instanceof Error ? error.message : "Failed to analyze receipt";
      return res.status(500).json({ error: message });
    }
  });

  // Natural language chat command endpoint
  app.post("/api/chat/command", async (req, res) => {
    try {
      const { message, history = [], receipt, people = [] } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message prompt required" });
      }

      const ai = getGenAI();

      const prompt = `Current Bill State:
Restaurant: "${receipt?.restaurantName || "Restaurant"}"
Subtotal: $${receipt?.subtotal || 0}, Tax: $${receipt?.tax || 0}, Tip: $${receipt?.tip || 0}, Total: $${receipt?.total || 0}
Active People: ${JSON.stringify(people)}

Receipt Items List:
${JSON.stringify(
  (receipt?.items || []).map((it: { id: string; name: string; price: number; assignedTo: string[] }) => ({
    id: it.id,
    name: it.name,
    price: it.price,
    assignedTo: it.assignedTo,
  })),
  null,
  2
)}

Recent Chat History:
${JSON.stringify(history.slice(-6))}

User Command: "${message}"

Your goal:
1. Interpret what the user wants to assign, change, or ask.
Examples:
- "Dhruv had the nachos" -> Assign item with nachos in name to person "Dhruv". Add Dhruv to people if not already there.
- "Sarah and Sue shared the pizza" -> Assign pizza to BOTH "Sarah" and "Sue". They share it 50/50.
- "Everyone shared the calamari" -> Assign calamari to all active people in the group.
- "Add 20% tip" -> Set tip to 20% of subtotal.
- "Tax is $6.50" -> Update tax to $6.50.
- "Remove Dhruv from nachos" -> Remove Dhruv from item's assignedTo.
- "Split remaining items equally" -> Take all items that currently have assignedTo.length === 0 and assign them to all active people.
- "Reset assignments" -> Clear all assignments.

Generate a warm, friendly, concise conversational reply explaining what was changed and who owes what, along with concrete machine-readable actions.`;

      // System instruction giving specific role
      const systemInstruction = `You are SplitSmart AI, an expert bill-splitting assistant.
Your job is to help restaurant diners split receipt items, tax, and tip fairly and effortlessly using natural language.
Match items generously using substring, fuzzy matching, or keywords (e.g. "nachos" matches "Loaded Nachos Grande", "pizza" matches "Woodfired Margherita Pizza", "drinks" matches beverage items).
Ensure names are capitalized nicely (e.g. "dhruv" -> "Dhruv", "sarah" -> "Sarah").
Always return JSON matching the specified schema.`;

      // Try gemini-3.5-flash first for fast, high-quality interactive chat, fallback if needed
      const chatModels = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
      let lastError: unknown = null;
      let rawText = "";

      for (const modelName of chatModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  reply: {
                    type: Type.STRING,
                    description: "Friendly conversational response summarizing what was done and mentioning amounts/shares.",
                  },
                  actions: {
                    type: Type.ARRAY,
                    description: "List of state mutations to execute",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: {
                          type: Type.STRING,
                          enum: ["ASSIGN", "UNASSIGN", "SPLIT_EQUAL", "SET_TIP", "SET_TAX", "ADD_PERSON", "REMOVE_PERSON", "RESET_ASSIGNMENTS"],
                        },
                        description: { type: Type.STRING },
                        itemIds: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "The item IDs affected",
                        },
                        people: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Names of people to assign or affect",
                        },
                        value: {
                          type: Type.NUMBER,
                          description: "Numerical value for tip or tax",
                        },
                        isPercent: {
                          type: Type.BOOLEAN,
                          description: "True if value is percentage for tip",
                        },
                      },
                      required: ["type", "description"],
                    },
                  },
                  suggestedFollowups: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "2-3 short, context-relevant follow-up prompts the user could tap",
                  },
                },
                required: ["reply", "actions"],
              },
            },
          });

          rawText = response.text || "";
          if (rawText) {
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`Chat model ${modelName} failed, trying fallback:`, err);
        }
      }

      if (!rawText) {
        throw lastError || new Error("Failed to process chat command");
      }

      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (error: unknown) {
      console.error("Chat command error:", error);
      const message = error instanceof Error ? error.message : "Failed to execute chat command";
      return res.status(500).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
