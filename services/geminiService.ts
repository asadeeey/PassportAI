// services/geminiService.ts

import { GoogleGenAI, Modality } from "@google/genai";

/* ---------- helper ---------- */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

/* ---------- MAIN FUNCTION ---------- */
export const professionalizeImage = async (
  imageFile: File,
  aspectRatioText: string,
  suitColor: string,
  lightingDescription: string
): Promise<string> => {

  const API_KEY = import.meta.env.VITE_API_KEY;

  if (!API_KEY) {
    throw new Error("VITE_API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const base64Data = await fileToBase64(imageFile);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
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
6. ${lightingDescription || "Neutral professional studio lighting"}`,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (!response.candidates?.length) {
      throw new Error("AI did not return a result");
    }

    const parts = response.candidates[0].content?.parts ?? [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }

    throw new Error("AI did not generate an image");

  } catch (error) {
    console.error("Gemini error:", error);
    throw new Error(
      "Failed to process image with AI. Please try again later."
    );
  }
};
