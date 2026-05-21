import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Secure server-side Gemini API key access
const API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ 
  apiKey: API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Server-side image generation endpoint
app.post("/api/gemini/generate", async (req, res) => {
  const { articleTitle, materialColor, overlayText, aspectRatio } = req.body;

  if (!API_KEY) {
    return res.status(500).json({ 
      error: "API key is missing on the server. Please configure GEMINI_API_KEY in your hosting environment." 
    });
  }

  const prompt = `Create a professional industrial banner advertisement for Boss - Indo.
  
Visual Context Keywords:
- Project/Asset: "${articleTitle}"
- Headline: "${overlayText}"

Task:
Automatically identify the intended civil engineering material (like Geotextile, Geomembrane, Geogrid, or similar) from the keywords above.
Render a realistic large roll of this material partially unrolled.
The roll must show detailed textures: fiber structure, industrial weave, or smooth/textured polymer surface as appropriate for the product identified.
Color: ${materialColor}.

Background Setting:
Active civil engineering construction site in broad daylight. Bridge construction, yellow heavy machinery/excavators, soil and gravel ground.

Text & Branding:
1. Branding: White word "Indo Geotextile" only (modern sans-serif) at Top-Left. No logos/icons.
2. Main Headline: Bold, large text on the left: "${overlayText}". 
   - STYLE: USE WHITE COLOR.
   - TYPOGRAPHY: Clear, professional industrial font. USE GENEROUS LETTER SPACING (wide tracking) between characters to ensure perfect readability and prevent typos.
3. Sub Headline: A complementary professional 5-word subtitle. USE ACCENT PINK COLOR. Smaller scale. Use clean corporate spacing.
4. Technical Footer (Optional/Aksesoris): At the very bottom, add a clean dark-blue semi-transparent overlay bar. Inside this bar, include 3 or 4 small technical feature icons (like a shield for strength, a chain for bonding, or a droplet for filtration). Next to each icon, add very brief professional Indonesian text (e.g., "KUAT TARIK TINGGI", "TAHAN LAMA", "FILTRASI OPTIMAL"). This bar should look like a high-end product catalog feature.

Quality: 
Ultra high resolution, photorealistic industrial rendering, landscape ${aspectRatio}.

Negative Prompt:
cartoon, illustration, 3d render look, toy-like, plastic look, blurry, human hands, people, faces, low res.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No image generated (empty candidates).");
    }

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error("No image generated (missing content parts).");
    }

    const parts = content.parts;
    let textResponse = "";

    for (const part of parts) {
      if (part.inlineData) {
        return res.json({
          url: `data:image/png;base64,${part.inlineData.data}`,
          prompt: prompt
        });
      }
      if (part.text) {
        textResponse += part.text;
      }
    }

    if (textResponse) {
      throw new Error(`Model returned text instead of image: ${textResponse}`);
    }

    throw new Error("Image data not found in response.");
  } catch (error: any) {
    console.error("Error generating image:", error);
    res.status(500).json({ 
      error: `Generation Service Error: ${error.message || "Unknown error"}` 
    });
  }
});

// Handle Vite middleware & static files
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
