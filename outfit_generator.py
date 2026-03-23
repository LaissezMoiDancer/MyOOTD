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
 
app = FastAPI()
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
load_dotenv()
client = genai.Client(http_options={'api_version': 'v1'})
 
processed_json_url = "https://raw.githubusercontent.com/LaissezMoiDancer/MyOOTD/main/processed_json/"
clothing_items = []
 
for i in range(1, 14):
    item_url = f"{processed_json_url}clothes_item_{i}.json"
    response = requests.get(item_url)
    response.raise_for_status()
    clothing_items.append(response.json())
 
assets_url = "https://raw.githubusercontent.com/LaissezMoiDancer/MyOOTD/main/assets/"    
for item in clothing_items:
    clean_path = item["image_path"].replace("assets/", "")
    item["image_url"] = assets_url + clean_path
 
 
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
        return default_lat, default_long
 
def get_weather(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
    response = requests.get(url)
    data = response.json()
    temp = data['current_weather']['temperature']
    weathercode = data['current_weather'].get('weathercode', 0)
    return temp, weathercode
 
def weathercode_to_type(weathercode: int) -> str:
    """Convert Open-Meteo WMO weather code to a weather type string."""
    if weathercode == 0:
        return "sunny"
    elif weathercode in (1, 2, 3):
        return "cloudy"
    elif weathercode in range(51, 68) or weathercode in range(80, 83):
        return "raining"
    elif weathercode in range(71, 78) or weathercode in range(85, 87):
        return "snowy"
    elif weathercode in (45, 48):
        return "cloudy"
    else:
        return "cloudy"
 
def get_season(lat: float) -> str:
    """Return season based on hemisphere and current month."""
    month = __import__('datetime').datetime.now().month
    northern = lat >= 0
    if month in (3, 4, 5):
        return "spring" if northern else "autumn"
    elif month in (6, 7, 8):
        return "summer" if northern else "winter"
    elif month in (9, 10, 11):
        return "autumn" if northern else "spring"
    else:
        return "winter" if northern else "summer"
 
# FIX: warmth scale changed from 1-10 to 1-5 to match the clothing data
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
        return 4, 5
    elif temp >= -5:
        return 5, 5
    else:
        return 5, 5
 
 
def generating_baseoutfits(clothing_items, temp, formality, preferred_color=None):
    min_warmth, max_warmth = weather_to_warmth(temp)
    
    def has_formality(item, f):
        fv = item.get("formality")
        return f in fv if isinstance(fv, (list, tuple)) else fv == f
 
    formal_items = [i for i in clothing_items if has_formality(i, formality)]
    
    if preferred_color:
        color_matches = [i for i in formal_items if preferred_color.lower() in i["name"].lower()]
        if color_matches:
            formal_items = color_matches
 
    tops = []
    bottoms = []
    outerwear = []
    full_items = []
    
    for item in formal_items:
        categories = item.get("category", [])
        
        if "Full" in categories or ("Top" in categories and "Bottom" in categories):
            full_items.append(item)
        elif "Outerwear" in categories:
            outerwear.append(item)
        elif "Top" in categories:
            tops.append(item)
        elif "Bottom" in categories:
            bottoms.append(item)
 
    outfits = []
    seen = set()
 
    for full_item in full_items:
        base_warmth = full_item["warmth_rating"]
        
        if min_warmth <= base_warmth <= max_warmth:
            outfit_key = (full_item["id"],)
            if outfit_key not in seen:
                seen.add(outfit_key)
                outfits.append({
                    "items": [full_item],
                    "total_warmth": base_warmth
                })
        
        if (min_warmth - 2) <= base_warmth <= max_warmth:
            for jacket in outerwear:
                if jacket["id"] == full_item["id"]:
                    continue
                    
                jacket_warmth = jacket["warmth_rating"]
                if jacket_warmth <= 2:
                    bonus = 1
                else:
                    bonus = 2
                    
                total_warmth = base_warmth + bonus
                
                if min_warmth <= total_warmth <= max_warmth:
                    outfit_key = (full_item["id"], jacket["id"])
                    if outfit_key not in seen:
                        seen.add(outfit_key)
                        outfits.append({
                            "items": [full_item, jacket],
                            "total_warmth": total_warmth
                        })
 
    for top in tops:
        for bottom in bottoms:
            if top["id"] == bottom["id"]:
                continue
                
            base_warmth = max(top["warmth_rating"], bottom["warmth_rating"])
            
            if min_warmth <= base_warmth <= max_warmth:
                outfit_key = (top["id"], bottom["id"])
                if outfit_key not in seen:
                    seen.add(outfit_key)
                    outfits.append({
                        "items": [top, bottom],
                        "total_warmth": base_warmth
                    })
            
            if (min_warmth - 2) <= base_warmth <= max_warmth:
                for jacket in outerwear:
                    if jacket["id"] in (top["id"], bottom["id"]):
                        continue
                        
                    jacket_warmth = jacket["warmth_rating"]
                    if jacket_warmth <= 2:
                        bonus = 1
                    else:
                        bonus = 2
                    
                    total_warmth = base_warmth + bonus
                    
                    if min_warmth <= total_warmth <= max_warmth:
                        outfit_key = (top["id"], bottom["id"], jacket["id"])
                        if outfit_key not in seen:
                            seen.add(outfit_key)
                            outfits.append({
                                "items": [top, bottom, jacket],
                                "total_warmth": total_warmth
                            })
    
    return outfits
 
# FIX: broken f-string — build outfit list before the prompt
async def evaluate_outfits(outfits, temp, formality, preferred_color=None):
    if not outfits: return []
 
    descriptions = []
    for i, outfit in enumerate(outfits):
        names = [item['name'] for item in outfit["items"]]
        descriptions.append(f"#{i+1}: {', '.join(names)}")
 
    color_context = f"The user prefers {preferred_color}." if preferred_color else ""
 
    # FIX: build the outfit list string before the f-string so it interpolates correctly
    outfit_list = "\n".join(descriptions)
 
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
    2. Weather Logic: At {temp}°C, ensure the layering makes sense.
    3. Note Quality: Your 'stylist_note' must explain *why* the pieces work together.
 
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
    {outfit_list}
    """
    
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt]
        )
 
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
 
style_cache = {}
 
@app.get("/weather")
async def weather_endpoint(city: str = Query("Algiers")):
    """Dedicated weather endpoint for the frontend to consume."""
    lat, lon = location_to_coordinates(city)
    temp, weathercode = get_weather(lat, lon)
    weather_type = weathercode_to_type(weathercode)
    season = get_season(lat)
    return {
        "city": city,
        "temperature": temp,
        "context": f"{weather_type.capitalize()}, {temp}°C",
        "type": weather_type,
        "season": season
    }
 
@app.get("/top-outfits")
async def top_outfits(
    city: str = Query("Algiers"), 
    formality: str = Query("Casual"),
    color: Optional[str] = Query(None)
):
    lat, lon = location_to_coordinates(city)
    temp, weathercode = get_weather(lat, lon)
    
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
 
    style_cache[cache_key] = best_outfits
 
    return {
        "city": city,
        "temperature": temp,
        "formality": formality,
        "preferred_color": color,
        "top_outfits": best_outfits
    }