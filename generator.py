import os
import io
import json
from PIL import Image
from google import genai
from dotenv import load_dotenv

# 1. Setup Environment & Client
# It's better to use a .env file, but for now we'll keep your key
client = genai.Client(api_key="AIzaSyDr-2kbzzxVKrti_lMbI5RHdergrnWgFvY")

def analyze_clothing(image_path):
    """Analyzes a local image file using the Gemini API."""
    # Open the image from your local folder
    img = Image.open(image_path)
    
    prompt = (
        "Act as a professional fashion cataloger. Analyze this image and generate a JSON object: "
        "{id: 'item_XXX', name: 'string', category: ['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessory'], "
        "warmth_rating: 1-5, formality: ['Casual', 'Semi-Formal', 'Formal'], image_path: 'assets/filename.jpg'}. "
        "Return ONLY raw JSON."
    )
    
    # 2. Generate Content
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite", 
        contents=[prompt, img]
    )
    
    # Clean and return JSON
    clean_json = response.text.replace('```json', '').replace('```', '').strip()
    return clean_json

# 3. Local Execution Logic
if __name__ == "__main__":
    # Point this to a real image file on your computer!
    # Example: 'C:/Users/You/Desktop/shirt.jpg' or just 'shirt.jpg' if in the same folder
    image_to_test = "clothes_item_1.jpg" 

    if os.path.exists(image_to_test):
        print(f"Analyzing {image_to_test}...")
        result_json = analyze_clothing(image_to_test)
        print("\n--- Extracted Wardrobe Data ---")
        print(result_json)
    else:
        print(f"Error: Could not find the file '{image_to_test}' in your project folder.")