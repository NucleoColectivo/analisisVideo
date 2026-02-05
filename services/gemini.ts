
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VideoAnalysis } from "../types";

export class GeminiService {
  constructor() {}

  // Creamos la instancia justo antes de usarla para asegurar que toma la API KEY actualizada
  private createClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeVideo(videoUrl: string): Promise<VideoAnalysis> {
    const ai = this.createClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `REALIZA UN ANÁLISIS TÉCNICO Y FACTUAL del siguiente video de YouTube: ${videoUrl}.
        
        IMPORTANTE: TODO EL RESULTADO DEBE ESTAR EN ESPAÑOL.
        
        Instrucciones:
        1. Identifica Título, Creador y Duración.
        2. Resume el contenido y el tema central.
        3. Analiza el estilo visual y las técnicas de animación (IA, Motion Graphics, etc).
        4. Genera un desglose de al menos 5 escenas con marca de tiempo MM:SS y segundo entero.
        5. Evalúa complejidad visual (0-100) y densidad de información (0-100).

        La salida debe ser estrictamente JSON en ESPAÑOL.`,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 16000 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              duration: { type: Type.STRING },
              theme: { type: Type.STRING },
              contentSummary: { type: Type.STRING },
              visualStyle: { type: Type.STRING },
              animations: { type: Type.ARRAY, items: { type: Type.STRING } },
              keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
              sceneBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    seconds: { type: Type.INTEGER },
                    description: { type: Type.STRING },
                    tag: { type: Type.STRING }
                  },
                  required: ["time", "seconds", "description"]
                }
              },
              targetAudience: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              technicalDetails: {
                type: Type.OBJECT,
                properties: {
                  frameRate: { type: Type.STRING },
                  resolution: { type: Type.STRING },
                  visualComplexity: { type: Type.INTEGER },
                  informationDensity: { type: Type.INTEGER }
                }
              }
            },
            required: ["title", "duration", "theme", "contentSummary", "visualStyle", "animations", "keyTakeaways", "sceneBreakdown", "targetAudience"]
          }
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web?.title || 'Fuente de Verificación',
          uri: chunk.web?.uri || ''
        }));

      const text = response.text || '{}';
      return { ...JSON.parse(text), sources };
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error("QUOTA_EXCEEDED");
      }
      if (err.message?.includes('Requested entity was not found')) {
        throw new Error("ENTITY_NOT_FOUND");
      }
      throw err;
    }
  }

  async generateNarration(text: string): Promise<string> {
    const ai = this.createClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Voz profesional, clara y autoritaria en español: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");
    return base64Audio;
  }
}

export const geminiService = new GeminiService();
