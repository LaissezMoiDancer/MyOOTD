
export interface StylePreferences {
  location: string;
  occasion: 'Casual' | 'Formal' | 'Semi-formal';
  preferredColor: string;
}

export interface StyleAnalysis {
  bodyType: string;
  skinTone: string;
  recommendedColors: string[];
  suggestedStyles: string[];
  vibeDescription: string;
  weatherContext?: string;
  weatherType?: 'sunny' | 'windy' | 'snowy' | 'cloudy' | 'raining';
}

export interface OutfitRecommendation {
  title: string;
  description: string;
  occasion: string;
  keyItems: string[];
  imageUrl: string;
}

export type AppStep = 'location' | 'occasion' | 'closet' | 'analyzing' | 'result' | 'wardrobe';

export interface UserPhoto {
  url: string;
  base64: string;
  mimeType: string;
  id?: string;
}
