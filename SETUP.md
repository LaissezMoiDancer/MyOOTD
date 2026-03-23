# MyOOTD Setup Guide

This guide will help you get your AI Fashion Stylist website up and running.

## Project Overview

This is a full-stack application with:
- **Frontend**: React + TypeScript + Vite (runs on port 3000)
- **Backend**: Python FastAPI (runs on port 8000)
- **AI**: Google Gemini API for style analysis and recommendations

## Prerequisites

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Python** (3.10 or higher) - [Download here](https://www.python.org/downloads/)
3. **Google Gemini API Key** - Get one from [Google AI Studio](https://aistudio.google.com/)

## Step-by-Step Setup

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create or update `.env.local` in the root directory:

```env
GEMINI_API_KEY=your_actual_api_key_here
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

**Important**: Replace `your_actual_api_key_here` with your actual Google Gemini API key.

### 3. Set Up Python Backend

#### 3.1 Create a Virtual Environment (Recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python -m venv venv
source venv/bin/activate
```

#### 3.2 Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 3.3 Set Up Backend Environment Variables

Create a `.env` file in the root directory (for the Python backend):

```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 4. Start the Backend Server

In one terminal window, start the Python FastAPI server:

```bash
# Make sure your virtual environment is activated
uvicorn outfit_generator:app --reload --port 8000
```

You should see output like:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 5. Start the Frontend Development Server

In another terminal window, start the Vite dev server:

```bash
npm run dev
```

You should see output like:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

### 6. Access the Website

Open your browser and navigate to:
```
http://localhost:3000
```

## Troubleshooting

### Backend Not Connecting

- **Check if backend is running**: Make sure the Python server is running on port 8000
- **Check CORS**: The backend has CORS enabled for all origins, so this shouldn't be an issue
- **Check API endpoint**: Verify `http://127.0.0.1:8000/top-outfits` is accessible

### API Key Issues

- **Frontend**: Make sure `.env.local` has `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY`
- **Backend**: Make sure `.env` has `GEMINI_API_KEY`
- **Verify key**: Test your API key at [Google AI Studio](https://aistudio.google.com/)

### Port Already in Use

- **Frontend (3000)**: Change port in `vite.config.ts` or kill the process using port 3000
- **Backend (8000)**: Change port in the uvicorn command or kill the process using port 8000

### Module Not Found Errors

- **Frontend**: Run `npm install` again
- **Backend**: Make sure virtual environment is activated and run `pip install -r requirements.txt`

## Project Structure

```
MyOOTD/
├── App.tsx              # Main React component
├── index.tsx            # React entry point
├── services/
│   └── gemini.ts        # Gemini API service functions
├── outfit_generator.py  # Python FastAPI backend
├── package.json         # Frontend dependencies
├── requirements.txt     # Python dependencies
├── vite.config.ts       # Vite configuration
└── .env.local           # Frontend environment variables
```

## Features

- **Weather Integration**: Uses Google Search to get real-time weather
- **Style Analysis**: Analyzes clothing images using Gemini Vision
- **Outfit Recommendations**: Gets AI-curated outfit suggestions from your wardrobe
- **Wardrobe Management**: Upload and manage your clothing items

## Development Commands

```bash
# Frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build

# Backend
uvicorn outfit_generator:app --reload --port 8000
```

## Next Steps

1. Get your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Add it to both `.env.local` (frontend) and `.env` (backend)
3. Start both servers
4. Open http://localhost:3000 in your browser
5. Upload some clothing items to your wardrobe
6. Start getting style recommendations!
