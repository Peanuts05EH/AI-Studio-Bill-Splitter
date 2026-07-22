import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

const app = express();
const PORT = 3000;

// Body parser with size limits for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Parse Receipt API
app.post("/api/parse-receipt", async (req, res) => {
  try {
    const { imageBase64, mimeType, textInput } = req.body;
    const client = getGeminiClient();

    let contentParts: any[] = [];
    let prompt = "Extract all individual items, their quantities, their listed total prices, the subtotal, service charge percentage, tax/GST percentage, and grand total from this receipt. Return the structured JSON.";

    if (imageBase64 && mimeType) {
      // Remove any base64 data URL prefix if present
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      contentParts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      });
      contentParts.push({ text: prompt });
    } else if (textInput) {
      contentParts.push({
        text: `${prompt}\n\nHere is the raw text of the receipt:\n${textInput}`,
      });
    } else {
      res.status(400).json({ error: "No receipt image or text input provided" });
      return;
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentParts,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              description: "List of items on the receipt",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the item" },
                  quantity: { type: Type.NUMBER, description: "Quantity of the item ordered" },
                  totalPrice: { type: Type.NUMBER, description: "The total price listed for this item quantity" },
                },
                required: ["name", "quantity", "totalPrice"],
              },
            },
            subtotal: { type: Type.NUMBER, description: "The receipt subtotal before taxes and service charges" },
            serviceChargePercent: { type: Type.NUMBER, description: "The service charge percentage, if any (e.g. 10 for 10% service charge)" },
            taxPercent: { type: Type.NUMBER, description: "The GST or sales tax percentage, if any (e.g. 9 for 9% GST)" },
            total: { type: Type.NUMBER, description: "The grand total of the receipt" },
          },
          required: ["items", "subtotal", "total"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedData = JSON.parse(resultText);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in parse-receipt:", error);
    res.status(500).json({
      error: "Failed to parse receipt. Please make sure the API key is set or adjust values manually.",
      details: error.message,
    });
  }
});

// Configure Vite or Static Files
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Vite startup error:", err);
});
