import os
import json
import requests
from google import genai
from pydantic import BaseModel  
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware


class OutfitFeedback(BaseModel):
    outfit_index: int
    stylist_note: str

class OutfitSelection(BaseModel):
    top_outfits: List[OutfitFeedback]

app = FastAPI() #initialize FastAPI app

#setup CORS so frontend to backend communication possible
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv() #load env variable that contains API key
client = genai.Client(http_options={'api_version': 'v1'})  # will use GEMINI_API_KEY from env

#load jsons of clothing items from github
processed_json_url = "https://raw.githubusercontent.com/LaissezMoiDancer/MyOOTD/main/processed_json/"
clothing_items = []

for i in range(1, 14): #looping through the 13 items uploaded to github
    item_url = f"{processed_json_url}clothes_item_{i}.json"
    response = requests.get(item_url)
    response.raise_for_status()
    clothing_items.append(response.json())

#prepping URL link of clothing for Frontend display of items 
assets_url = "https://raw.githubusercontent.com/LaissezMoiDancer/MyOOTD/main/assets/"    
for item in clothing_items:
    # ensuring the path doesn't double up on 'assets/' if it's already in the JSON
    clean_path = item["image_path"].replace("assets/", "")
    item["image_url"] = assets_url + clean_path


#default coordinates for Algiers (its temp thats most fitting for current database of items)
default_lat = 36.73225
default_long = 3.08746

def location_to_coordinates(location):
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1"
    response = requests.get(url)
    data = response.json()
    if "results" in data and len(data["results"]) > 0:
        lat = data["results"][0]["latitude"]
        lon = data["results"][0]["longitude"]
        return lat, lon
    else:
        #they dont sepciify
        return default_lat, default_long

#get weather from Open-Meteo
def get_weather(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    response = requests.get(url)
    data = response.json()
    temp = data['current_weather']['temperature']
    return temp

#associate temp to clothing warmth ranking
def weather_to_warmth(temp):
    if temp >= 28:
        return 1, 2
    elif temp >= 22:
        return 2, 3
    elif temp >= 16:
        return 3, 4
    elif temp >= 10:
        return 4, 5
    elif temp >= 4:
        return 6, 8
    elif temp >= -5:
        return 8, 9
    else:
        return 9, 10


#parsing clothing items to get outfits that fit requirements (temp, formality) 
# REMARK : THIS GIVES A LOT OF OUTFITS THAT MATCH REQUIREMENTS, API WILL PICK 2-3 BEST OUTFIT TO GIVE TO USER

def generating_baseoutfits(clothing_items, temp, formality, preferred_color=None):
    min_warmth, max_warmth = weather_to_warmth(temp)
    
    def has_formality(item, f):
        fv = item.get("formality")
        return f in fv if isinstance(fv, (list, tuple)) else fv == f

    #filter by formality
    formal_items = [i for i in clothing_items if has_formality(i, formality)]
    
    #prioritize color if requested (SOFT filter)
    if preferred_color:
        color_matches = [i for i in formal_items if preferred_color.lower() in i["name"].lower()]
        if color_matches:
            formal_items = color_matches

    #strict categorization (items can only be in one category to avoid nonsensical pairings)
    tops = []
    bottoms = []
    outerwear = []
    full_items = []
    
    for item in formal_items:
        categories = item.get("category", [])
        
        #priority to full items first
        if "Full" in categories or ("Top" in categories and "Bottom" in categories):
            full_items.append(item)
        #then outerwear
        elif "Outerwear" in categories:
            outerwear.append(item)
        #then tops and bottoms
        elif "Top" in categories:
            tops.append(item)
        elif "Bottom" in categories:
            bottoms.append(item)

    outfits = []
    seen = set()

    #Full-body items (dresses, jumpsuits)
    for full_item in full_items:
        base_warmth = full_item["warmth_rating"]
        
        #can be worn alone if meets warmth range
        if min_warmth <= base_warmth <= max_warmth:
            outfit_key = (full_item["id"],)
            if outfit_key not in seen:
                seen.add(outfit_key)
                outfits.append({
                    "items": [full_item],
                    "total_warmth": base_warmth
                })
        
        #can be paired with outerwear if base warmth is within [min_warmth-3, max_warmth]
        if (min_warmth - 3) <= base_warmth <= max_warmth:
            for jacket in outerwear:
                if jacket["id"] == full_item["id"]:
                    continue
                    
                #calculate outerwear bonus
                jacket_warmth = jacket["warmth_rating"]
                if jacket_warmth <= 2:
                    bonus = 1
                elif jacket_warmth <= 4:
                    bonus = 2
                else:
                    bonus = 3
                    
                total_warmth = base_warmth + bonus
                
                #only add if final warmth is in range
                if min_warmth <= total_warmth <= max_warmth:
                    outfit_key = (full_item["id"], jacket["id"])
                    if outfit_key not in seen:
                        seen.add(outfit_key)
                        outfits.append({
                            "items": [full_item, jacket],
                            "total_warmth": total_warmth
                        })

    #Top + bottom combinations
    for top in tops:
        for bottom in bottoms:
            if top["id"] == bottom["id"]:
                continue
                
            base_warmth = max(top["warmth_rating"], bottom["warmth_rating"])
            
            #can be worn alone if meets warmth range
            if min_warmth <= base_warmth <= max_warmth:
                outfit_key = (top["id"], bottom["id"])
                if outfit_key not in seen:
                    seen.add(outfit_key)
                    outfits.append({
                        "items": [top, bottom],
                        "total_warmth": base_warmth
                    })
            
            #can be paired with outerwear if base warmth is within [min_warmth-3, max_warmth]
            if (min_warmth - 3) <= base_warmth <= max_warmth:
                for jacket in outerwear:
                    if jacket["id"] in (top["id"], bottom["id"]):
                        continue
                        
                    jacket_warmth = jacket["warmth_rating"]
                    if jacket_warmth <= 2:
                        bonus = 1
                    elif jacket_warmth <= 4:
                        bonus = 2
                    else:
                        bonus = 3
                    
                    total_warmth = base_warmth + bonus
                    
                    #only add if final warmth is in range
                    if min_warmth <= total_warmth <= max_warmth:
                        outfit_key = (top["id"], bottom["id"], jacket["id"])
                        if outfit_key not in seen:
                            seen.add(outfit_key)
                            outfits.append({
                                "items": [top, bottom, jacket],
                                "total_warmth": total_warmth
                            })
    
    return outfits

#USING GEMINI AI TO SELECT BEST 3 OUTFITS 
async def evaluate_outfits(outfits, temp, formality, preferred_color=None):
    if not outfits: return []

    descriptions = []
    for i, outfit in enumerate(outfits):
        names = [item['name'] for item in outfit["items"]]
        descriptions.append(f"#{i+1}: {', '.join(names)}")

    color_context = f"The user prefers {preferred_color}." if preferred_color else ""

    #clear instructions for 2.5 Flash
    prompt = f"""
    ### ROLE
    You are an elite high-fashion stylist for a luxury concierge service. Your tone is sophisticated, encouraging, and expert.

    ### CONTEXT
    - Temperature: {temp}°C
    - Occasion/Formality: {formality}
    - User Color Preference: {preferred_color if preferred_color else "None (Use your expert judgment)"}

    ### TASK
    From the list of OUTFITS provided, select the 3 BEST combinations that balance color harmony, appropriate warmth for {temp}°C, and the {formality} dress code.

    ### STYLING RULES
    1. Color Theory: Prioritize outfits with complementary colors or sophisticated monochromatic looks.
    2. Weather Logic: At {temp}°C, ensure the layering makes sense (e.g., don't suggest a heavy coat if it's 25°C).
    3. Note Quality: Your 'stylist_note' must explain *why* the pieces work together. Mention a specific detail like "The silhouette of the {bottoms[0]['name'] if 'bottoms' in locals() else 'bottom'} balances the structured top."

    ### OUTPUT FORMAT
    Return ONLY a JSON object. No conversation.
    {{
      "top_outfits": [
        {{
          "outfit_index": 1, 
          "stylist_note": "A 15-word expert styling tip focusing on texture or color harmony."
        }}
      ]
    }}

    ### OUTFITS TO EVALUATE
    {"\n".join(descriptions)}
    """
    
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash", 
            contents=[prompt]
        )

        #clean and parse the JSON
        text_data = response.text.strip()
        if "```json" in text_data:
            text_data = text_data.split("```json")[1].split("```")[0].strip()
        elif "```" in text_data:
            text_data = text_data.split("```")[1].split("```")[0].strip()
             
        data = json.loads(text_data)

        final_recommendations = []
        for selection in data.get("top_outfits", []):
            idx = selection["outfit_index"] - 1
            if 0 <= idx < len(outfits):
                recommended = outfits[idx].copy()
                recommended["stylist_note"] = selection["stylist_note"]
                final_recommendations.append(recommended)
        
        return final_recommendations if final_recommendations else outfits[:3]

    except Exception as e:
        print(f"STYLISH ERROR LOG: {e}") 
        fallback = outfits[:3]
        for item in fallback:
            item["stylist_note"] = "A stylish choice that balances your preferences with the current weather."
        return fallback

style_cache = {} #cache to store AI recommendations for combos so we save up quotas

#route to get 3 best outfits based on location and formality 

@app.get("/top-outfits")
async def top_outfits(
    city: str = Query("Algiers"), 
    formality: str = Query("Casual"),
    color: Optional[str] = Query(None) #added color query
):
    lat, lon = location_to_coordinates(city) 
    temp = get_weather(lat, lon)
    
    #create a unique key for this specific combo and round the temp to the nearest 5 degrees so the cache is more effective
    #we include color in the key so different colors get different results
    cache_key = (round(temp / 5) * 5, formality, color.lower() if color else None)

    if cache_key in style_cache:
        print("Using cached stylist notes! (Quota saved ✨)")
        return {
            "city": city,
            "temperature": temp,
            "formality": formality,
            "preferred_color": color,
            "top_outfits": style_cache[cache_key]
        }

    outfits = generating_baseoutfits(clothing_items, temp, formality, color)
    best_outfits = await evaluate_outfits(outfits, temp, formality, color)

    #store the result for next time
    style_cache[cache_key] = best_outfits

    return {
        "city": city,
        "temperature": temp,
        "formality": formality,
        "preferred_color": color,
        "top_outfits": best_outfits
    }