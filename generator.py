import os
import json
from PIL import Image
from google import genai
from dotenv import load_dotenv
 
load_dotenv()
 
# FIX: removed hardcoded API key — now reads GEMINI_API_KEY from .env
client = genai.Client()
 
def analyze_clothing(image_path):
    """Analyzes a local image file using the Gemini API."""
    img = Image.open(image_path)
    
    # FIX: warmth_rating scale changed to 1-10 to match outfit_generator.py
    prompt = (
        "Act as a professional fashion cataloger. Analyze this image and generate a JSON object: "
        "{id: 'item_XXX', name: 'string', category: ['Top', 'Bottom', 'Outerwear', 'Full', 'Shoes', 'Accessory'], "
        "warmth_rating: integer from 1 (very light/summer) to 10 (very warm/winter), "
        "formality: ['Casual', 'Semi-Formal', 'Formal'], image_path: 'assets/filename.jpg'}. "
        "Note: warmth_rating 1-2 = tank tops/shorts, 3-4 = t-shirts/light trousers, "
        "5-6 = sweaters/jeans, 7-8 = coats/thick layers, 9-10 = heavy winter gear. "
        "Return ONLY raw JSON."
    )
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[prompt, img]
    )
    
    clean_json = response.text.replace('```json', '').replace('```', '').strip()
    return clean_json
 
if __name__ == "__main__":
    image_to_test = "clothes_item_1.jpg" 
 
    if os.path.exists(image_to_test):
        print(f"Analyzing {image_to_test}...")
        result_json = analyze_clothing(image_to_test)
        print("\n--- Extracted Wardrobe Data ---")
        print(result_json)
    else:
        print(f"Error: Could not find the file '{image_to_test}' in your project folder.")