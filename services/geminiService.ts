// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";

/* ---------- helper ---------- */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data-URL prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

/* ---------- MAIN FUNCTION ---------- */
export const professionalizeImage = async (
  imageFile: File,
  aspectRatioText: string,
  suitColor: string,
  lightingDescription: string
): Promise<string> => {

  // 1. MATCH THE KEY NAME FROM YOUR VITE CONFIG & NETLIFY
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    console.error("API Key is missing. Check Netlify Environment Variables.");
    throw new Error("Missing API Key");
  }

  // Initialize the new GenAI SDK
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const base64Data = await fileToBase64(imageFile);

    const response = await ai.models.generateContent({
      // 2. CRITICAL: Use the model that supports Image Generation
      model: "gemini-2.0-flash-exp", 
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: imageFile.type,
              },
            },
            {
              text: `Transform this headshot into a professional passport photo.
              
              Requirements:
              1. Add a professional ${suitColor} business suit with shirt and tie
              2. Plain off-white or light grey background
              3. Studio-quality lighting and sharpness
              4. Preserve identity strictly
              5. Maintain ${aspectRatioText} aspect ratio
              6. ${lightingDescription || "Neutral professional studio lighting"}
              
              Output ONLY the raw image data.`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ["IMAGE"], // Force image output
      },
    });

    // 3. Handle the response safely
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("AI did not return a candidate.");
    }

    const parts = response.candidates[0].content?.parts;
    
    // Look specifically for the binary image part
    if (parts && parts[0] && parts[0].inlineData && parts[0].inlineData.data) {
        return parts[0].inlineData.data;
    }

    throw new Error("AI response did not contain image data.");

  } catch (error: any) {
    // Better error logging for debugging
    console.error("Gemini API Error:", error);
    if (error.message?.includes("404")) {
        console.error("Model not found? Check if 'gemini-2.0-flash-exp' is active on your API key.");
    }
    throw error;
  }
};
