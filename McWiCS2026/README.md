# AI Fashion Stylist API

An intelligent outfit recommendation engine built with **FastAPI** and **Google Gemini 2.5 Flash**. This project helps users curate the perfect look based on weather, occasion, and personal color preferences.

## Features
- **Smart Selection:** Uses Gemini 2.5 to analyze a closet database and pick the top 3 outfits.
- **Expert Stylist Notes:** Generates sophisticated fashion advice for every recommendation.
- **Weather-Aware:** Automatically adjusts suggestions based on local temperature.
- **Color Theory:** Prioritizes outfits based on user-preferred colors and high-fashion principles.

## Tech Stack
- **Backend:** FastAPI (Python 3.10+)
- **AI Model:** Google Gemini 2.5 Flash
- **Data Validation:** Pydantic
- **Environment Management:** Dotenv

## Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- A Google Gemini API Key (Get one from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation
Clone the repository and install the dependencies:
```bash
# Clone the project
git clone <your-repo-url>
cd <your-project-folder>

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install libraries
pip install -r requirements.txt
