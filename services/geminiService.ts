import { GoogleGenAI, Modality } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // The result includes the data URL prefix (e.g., "data:image/png;base64,"), 
            // which needs to be removed for the API.
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = error => reject(error);
    });
};

export const professionalizeImage = async (imageFile: File, aspectRatioText: string, suitColor: string, lightingDescription: string): Promise<string> => {
    if (!import.meta.env.VITE_API_KEY) {
  throw new Error("VITE_API_KEY environment variable is not set");
}

    }
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    
    try {
        const base64Data = await fileToBase64(imageFile);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: imageFile.type,
                        },
                    },
                    {
                        text: `The provided image is a headshot. Transform it into a professional studio-quality photograph suitable for a passport.
Key requirements:
1.  **Add Clothing:** Add a realistic, professional ${suitColor} business suit **with a crisp dress shirt and a high-quality, elegant tie** that fits the person's posture and the existing crop.
2.  **Set Background:** Change the background to a plain, solid, off-white or light grey.
3.  **Studio Quality & Upscaling:** Re-render the image to look as if taken with a high-end studio camera (8K resolution). **Upscale the face to high definition**, significantly improving sharpness, skin texture, and clarity without introducing artifacts.
4.  **Preserve Identity:** **STRICTLY** preserve the person's facial features and identity. Do not change the shape of the face, eyes, nose, or mouth. The goal is to *clarify* and *sharpen* the existing face, not generate a new one.
5.  **Maintain Aspect Ratio:** The final image's aspect ratio must be a ${aspectRatioText} ratio. Do not crop or alter the dimensions.
6.  **Lighting & White Balance:** ${lightingDescription ? `Strictly adhere to this specific instruction for lighting and tone: "${lightingDescription}".` : 'Ensure neutral, balanced professional studio lighting with natural skin tones. Correct any color casts (e.g., yellow/blue tint) to achieve perfect white balance.'}`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        // Detailed response validation
        if (!response.candidates || response.candidates.length === 0) {
            const blockReason = response.promptFeedback?.blockReason;
            if (blockReason) {
                // e.g., "SAFETY"
                throw new Error(`Image rejected by AI safety filters (${blockReason}). Please try a different photo.`);
            }
            throw new Error("AI did not provide a response. The model may be overloaded. Please try again.");
        }

        const firstCandidate = response.candidates[0];

        // Check for content and parts
        if (!firstCandidate.content || !firstCandidate.content.parts || firstCandidate.content.parts.length === 0) {
            throw new Error("AI response was empty. Please try again with a different photo.");
        }
        
        for (const part of firstCandidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }

        throw new Error("AI did not generate an image. Please try a different photo.");

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            // Specific check for quota exhaustion, which is not recoverable by retrying.
            if (message.includes('resource_exhausted') || message.includes('quota')) {
                 throw new Error("API quota exceeded. Please check your plan and billing details. This job will not be retried.");
            }
            // Check for temporary rate limits, which are recoverable.
            if (message.includes('rate limit')) {
                throw new Error("Rate limit exceeded. Retrying automatically...");
            }
            // Re-throw existing specific errors from earlier in the try block.
            if (message.includes('safety filters') || message.includes('ai did not')) {
                throw error;
            }
        }
        
        // General fallback for network errors, etc.
        throw new Error("Failed to process image with AI. Check your connection or try again later.");
    }
};
