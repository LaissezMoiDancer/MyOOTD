import os
import json
import time
from PIL import Image
from google import genai
from dotenv import load_dotenv

# 1. Setup Environment & Client
load_dotenv()
# Note: It's safer to use os.getenv("GEMINI_API_KEY"), but hardcoded for your quick fix:
client = genai.Client(api_key="AIzaSyDr-2kbzzxVKrti_lMbI5RHdergrnWgFvY")

# 2. Define Folders
IMAGE_FOLDER = "assets"
OUTPUT_FOLDER = "processed_json"
BATCH_SIZE = 10 

if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER)

def get_chunks(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

def process_wardrobe():
    valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')
    all_images = [f for f in os.listdir(IMAGE_FOLDER) if f.lower().endswith(valid_extensions)]
    
    # Critical: Only process what isn't already in the JSON folder
    images_to_process = [f for f in all_images if not os.path.exists(os.path.join(OUTPUT_FOLDER, os.path.splitext(f)[0] + ".json"))]
    
    if not images_to_process:
        print(" All images are already processed!")
        return

    print(f"Found {len(images_to_process)} images to process. Using 'Slow & Steady' mode...")

    batches = list(get_chunks(images_to_process, BATCH_SIZE))

    for i, batch in enumerate(batches):
        print(f"\n--- Starting Batch {i+1} ---")
        
        for filename in batch:
            input_path = os.path.join(IMAGE_FOLDER, filename)
            output_filename = os.path.splitext(filename)[0] + ".json"
            output_path = os.path.join(OUTPUT_FOLDER, output_filename)

            print(f"Analyzing {filename}...", end=" ", flush=True)
            
            try:
                img = Image.open(input_path)
                prompt = (
                    "Act as a professional fashion cataloger. Analyze this image and generate a JSON object: "
                    "{id: 'item_XXX', name: 'string', category: ['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessory'], "
                    "warmth_rating: 1-10, formality: ['Casual', 'Semi-Formal', 'Formal'], image_path: 'assets/filename.jpg'}. "
                    "Return ONLY raw JSON."
                )

                response = client.models.generate_content(
                    model="gemini-2.5-flash-lite", 
                    contents=[prompt, img]
                )

                clean_json_str = response.text.replace('```json', '').replace('```', '').strip()
                
                with open(output_path, 'w') as f:
                    f.write(clean_json_str)
                
                print(f" Saved!")
                
                # Wait 15 seconds to stay under the 'Tokens Per Minute' limit
                time.sleep(15) 

            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    print(f"\n Rate limit hit! Resting for 60s...")
                    time.sleep(60)
                else:
                    print(f"\n Error with {filename}: {e}")

        if i < len(batches) - 1:
            print(f"Batch {i+1} complete. Waiting 30s before next batch...")
            time.sleep(30) 

    print("\n All finished! Check your 'processed_json' folder.")

if __name__ == "__main__":
    process_wardrobe()