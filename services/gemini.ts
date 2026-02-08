
import { GoogleGenAI, Type } from "@google/genai";
import { StyleAnalysis, OutfitRecommendation, StylePreferences } from "../types";

export const fetchWeather = async (location: string): Promise<{ context: string, type: 'sunny' | 'windy' | 'snowy' | 'cloudy' | 'raining', season: 'spring' | 'summer' | 'autumn' | 'winter', sources?: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Today is ${today}. Find the current weather, temperature, and current season (spring, summer, autumn, or winter) in ${location} based on this date and its hemisphere. 
    Categorize the weather into exactly one of these five types: sunny, windy, snowy, cloudy, raining.
    Return JSON: { "context": "Description like 'Clear, 22°C'", "type": "one of the five", "season": "one of the four seasons" }`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json"
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  try {
    const data = JSON.parse(response.text || "{}");
    // Strictly validate season strings
    const validSeasons = ['spring', 'summer', 'autumn', 'winter'];
    if (!validSeasons.includes(data.season?.toLowerCase())) {
      // Logic for fallback based on common months if AI fails
      const month = new Date().getMonth(); // 0-11
      if (month >= 2 && month <= 4) data.season = 'spring';
      else if (month >= 5 && month <= 7) data.season = 'summer';
      else if (month >= 8 && month <= 10) data.season = 'autumn';
      else data.season = 'winter';
    }
    return { ...data, season: data.season.toLowerCase(), sources };
  } catch {
    return { context: "Unknown, 20°C", type: "sunny", season: "spring", sources };
  }
};

export const analyzeStyle = async (
  imageBase64: string, 
  mimeType: string, 
  prefs: StylePreferences,
  weatherInfo: { context: string, type: string, season: string }
): Promise<StyleAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        {
          text: `You are a world-class luxury wardrobe consultant. 
          The user has uploaded an image of a piece of clothing from their closet.
          Target Location: ${prefs.location}. 
          Current Weather: ${weatherInfo.context}.
          Current Season: ${weatherInfo.season}.
          Target Occasion: ${prefs.occasion}.
          Preferred Accent Color: ${prefs.preferredColor}.

          Analyze the clothing piece in the photo. Identify its style, material, and vibe.
          
          Return a JSON object with:
          - bodyType: (e.g., Which body types this specific piece flatters most)
          - skinTone: (Which skin undertones this garment color complements best)
          - recommendedColors: (Array of 5 hex color codes that PAIR well with this garment and the accent ${prefs.preferredColor})
          - suggestedStyles: (Array of 3 styling aesthetics this piece fits into)
          - vibeDescription: (A summary of how to style this piece specifically for the weather, season, and occasion)
          - weatherContext: "${weatherInfo.context}"
          - weatherType: "${weatherInfo.type}"`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bodyType: { type: Type.STRING },
          skinTone: { type: Type.STRING },
          recommendedColors: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedStyles: { type: Type.ARRAY, items: { type: Type.STRING } },
          vibeDescription: { type: Type.STRING },
          weatherContext: { type: Type.STRING },
          weatherType: { type: Type.STRING }
        },
        required: ["bodyType", "skinTone", "recommendedColors", "suggestedStyles", "vibeDescription", "weatherContext", "weatherType"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as StyleAnalysis;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    throw new Error("Stylist was unable to process the wardrobe image. Please try again.");
  }
};

export const getOutfitRecommendations = async (
  analysis: StyleAnalysis, 
  prefs: StylePreferences
): Promise<OutfitRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Based on this wardrobe analysis:
  - Base Piece Attributes: ${analysis.vibeDescription}
  - Weather: ${analysis.weatherContext}
  - Location: ${prefs.location}
  - Target Occasion: ${prefs.occasion}
  - Suggested Pairing Palette: ${analysis.recommendedColors.join(', ')}
  
  Generate 3 complete outfit recommendations starting with the base piece provided in the image.
  Describe exactly what other items to pair with it (shoes, trousers/skirts, accessories).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            occasion: { type: Type.STRING },
            keyItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "description", "occasion", "keyItems"]
        }
      }
    }
  });

  try {
    const rawRecs = JSON.parse(response.text || "[]");
    return rawRecs.map((rec: any, idx: number) => ({
      ...rec,
      imageUrl: `https://picsum.photos/seed/fashion-closet-${idx}-${Date.now()}/600/800`
    }));
  } catch (error) {
    console.error("Failed to parse recommendations", error);
    return [];
  }
};
