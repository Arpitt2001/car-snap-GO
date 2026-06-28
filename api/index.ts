import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));

// API Routes
app.post('/api/recognize', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing. Please configure it in the settings.' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.split(';')[0].split(':')[1] || 'image/jpeg';
    
    const prompt = `
      Analyze this image and determine if it contains a car. 
      If it contains a car, provide the following information in strict JSON format:
      {
        "isCar": true,
        "brand": "string (e.g. Toyota, Ford, unknown)",
        "model": "string (e.g. Corolla, Mustang, unknown)",
        "color": "string",
        "rarity": "string (Strictly one of: 'Common', 'Rare', 'Legendary')",
        "confidence": number (0-100),
        "engine": "string (e.g. 3.0L V6, unknown)",
        "year": number (e.g. 2021, 0 if unknown),
        "topSpeed": "string (e.g. 155 mph, unknown)",
        "horsepower": "string (e.g. 300 hp, unknown)",
        "numberPlates": [
          { "ymin": number, "xmin": number, "ymax": number, "xmax": number }
        ]
      }
      For numberPlates, provide the highly accurate bounding box coordinates (normalized 0.0 to 1.0, where 0,0 is top-left and 1,1 is bottom-right) of any visible license plates. ONLY include the plate if you are absolutely certain it is a license plate. Make the bounding box tight and accurate. If none are visible or you are not sure, return an empty array.
      If it does not contain a car, return:
      {
        "isCar": false
      }
      Respond ONLY with the JSON object, no markdown blocks, no other text.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    },
                    { text: prompt }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json"
        }
    });

    const text = response.text;
    const result = JSON.parse(text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error('Error recognizing car:', error);
    res.status(500).json({ error: 'Failed to recognize car', details: error.message });
  }
});

app.post('/api/generate-questions', async (req, res) => {
  try {
    const { brand, model } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      Generate 8 hard multiple-choice trivia questions about the car ${brand} ${model}.
      Include various topics like car company, launch date in country, horse power, speed, design, history, etc.
      CRITICAL: Keep the questions extremely concise (maximum 10 to 15 words). The question must easily fit on 2 short lines to be quickly readable in a 10-second timer game. Do not add unnecessary details to the question.
      Return in strict JSON format as an array of objects:
      [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"],
          "correctIndex": number (0-3)
        }
      ]
      Do not include any other text, markdown, or explanations.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    const result = JSON.parse(text || "[]");
    res.json(result);
  } catch (error: any) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: 'Failed to generate questions', details: error.message });
  }
});

app.post('/api/car-specs', async (req, res) => {
  try {
    const { brand, model, location } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let locationContext = '';
    if (location && location.lat && location.lng) {
      locationContext = `The user is located at coordinates: ${location.lat}, ${location.lng}. Determine the country of this location and provide the launch year of this car specifically for that country.`;
    }
    
    const prompt = `
      Provide accurate technical specifications for the car: ${brand} ${model}.
      ${locationContext}
      Return the following information in strict JSON format:
      {
        "engine": "string (e.g., 3.0L Twin-Turbo V6, Electric Dual Motor, etc.)",
        "year": "number (most iconic or latest year)",
        "topSpeed": "string (e.g., 155 mph)",
        "horsepower": "string (e.g., 300 hp)"
      }
      Respond ONLY with the JSON object, no markdown blocks, no other text.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    const result = JSON.parse(text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching car specs:', error);
    res.status(500).json({ error: 'Failed to fetch car specs', details: error.message });
  }
});

app.post('/api/car-image', async (req, res) => {
  try {
    const { query } = req.body;
    let imageUrl = 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'; // fallback
    
    const API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const CX = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
    const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
    
    let found = false;
    if (API_KEY && CX) {
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query + ' car')}&cx=${CX}&key=${API_KEY}&searchType=image&num=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        imageUrl = data.items[0].link;
        found = true;
      }
    }
    
    if (!found && PIXABAY_KEY) {
      const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query + ' car')}&image_type=photo&per_page=3`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.hits && data.hits.length > 0) {
        imageUrl = data.hits[0].webformatURL;
      }
    }
    
    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Error fetching image:', error);
    res.json({ imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' });
  }
});

export default app;
