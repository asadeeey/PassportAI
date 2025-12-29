// services/geminiService.ts

/* ---------- Helper: File to Blob ---------- */
// We don't need base64 for Hugging Face, we send the Blob directly
const fileToBlob = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Blob([reader.result], { type: file.type }));
      } else {
        reject(new Error("Failed to convert file to blob"));
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

/* ---------- Helper: Blob to Base64 (for your app to display it) ---------- */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/* ---------- MAIN FUNCTION ---------- */
export const professionalizeImage = async (
  imageFile: File,
  aspectRatioText: string,
  suitColor: string,
  lightingDescription: string
): Promise<string> => {

  // 1. Get the Hugging Face Key
  const API_KEY = import.meta.env.VITE_HF_API_KEY || process.env.HF_API_KEY;

  if (!API_KEY) {
    throw new Error("Missing VITE_HF_API_KEY in Netlify.");
  }

  // 2. Define the Model (Flux is excellent for realism)
  // You can also use "stabilityai/stable-diffusion-xl-base-1.0"
  // This model works without special permissions
  const MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"; 
  const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

  // 3. Construct a specific prompt for Image-to-Image
  // Note: HF Inference API is mostly Text-to-Image. 
  // To keep it simple and free, we will generate a NEW professional photo based on the description.
  const prompt = `Professional passport photo, headshot, ${suitColor} business suit, shirt and tie, plain light grey background, ${lightingDescription}, photorealistic, 8k, sharp focus, ${aspectRatioText} aspect ratio`;

  try {
    // 4. Call the API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
            // Optional parameters to guide the generation
            width: 512,
            height: 512, 
        }
      }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("Hugging Face Error:", err);
        throw new Error(`HF API Error: ${response.statusText}`);
    }

    // 5. Hugging Face returns the raw image blob directly
    const imageBlob = await response.blob();
    
    // 6. Convert to Base64 so your React App can display it
    const base64Data = await blobToBase64(imageBlob);
    return base64Data;

  } catch (error) {
    console.error("Generation failed:", error);
    throw error;
  }
};
