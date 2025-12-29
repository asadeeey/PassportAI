import { GoogleGenAI } from "@google/genai";

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

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    throw new Error("API Key is missing. Check Netlify Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const base64Data = await fileToBase64(imageFile);

    // 1. CHANGE MODEL TO IMAGEN 3
    const response = await ai.models.generateContent({
      model: "imagen-3.0-generate-001", 
      contents: [
        {
          parts: [
            // Note: Imagen primarily does Text-to-Image. 
            // Sending the image as reference might work depending on the beta features available to your key,
            // otherwise it will generate a new person based on the description.
            {
              text: `A professional passport photo of a person wearing a ${suitColor} business suit with shirt and tie. 
              Background: Plain off-white or light grey. 
              Lighting: ${lightingDescription || "Studio-quality lighting"}.
              Aspect Ratio: ${aspectRatioText}.
              Style: Photorealistic, high resolution.`,
            },
          ],
        },
      ],
      // 2. REMOVE 'responseModalities' (Imagen defaults to image)
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

  } catch (error: any) {
    console.error("FULL API ERROR:", error);
    if (error.status === 404 || error.code === 404) {
         console.error("If you get a 404, it means your API Key does not have access to Imagen 3 yet.");
    }
    throw error;
  }
};
