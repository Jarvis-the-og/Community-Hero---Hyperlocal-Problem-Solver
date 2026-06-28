import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js';

let genAI = null;

export function getGeminiClient() {
  if (!genAI && config.geminiApiKey) {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

export function getModel(modelName = 'gemini-2.0-flash') {
  const client = getGeminiClient();
  if (!client) {
    throw new Error('Gemini API key not configured');
  }
  return client.getGenerativeModel({ model: modelName });
}

export async function generateText(prompt, options = {}) {
  const model = getModel(options.model);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateFromImage(prompt, imageData, mimeType = 'image/jpeg') {
  const model = getModel();
  const result = await model.generateContent([
    prompt,
    { inlineData: { data: imageData, mimeType } },
  ]);
  return result.response.text();
}

export function parseJsonResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}
