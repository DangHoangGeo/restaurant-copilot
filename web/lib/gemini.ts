/**
 * Google Gemini AI Helper Library
 *
 * This library provides a unified interface for Google Gemini AI interactions
 * across the restaurant management system. It supports:
 * - Multi-language translation for menu items
 * - Future features: customer chat, owner assistance, content generation
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { logger } from "./logger";

// Types for the library
export interface TranslationResult {
  en: string;
  ja: string;
  vi: string;
}

export interface DescriptionResult {
  en: string;
  ja: string;
  vi: string;
}

export interface MenuItemNameDescTags {
  name_en: string;
  name_ja: string;
  name_vi: string;
  description_en: string;
  description_ja: string;
  description_vi: string;
  tags: string[];
}

export interface GeneratedImageResult {
  data: string;
  mimeType: string;
}

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage?: "en" | "ja" | "vi" | "auto";
  context?: "menu_item" | "topping" | "description" | "general";
}

export interface ChatRequest {
  message: string;
  context: "owner_assistance" | "customer_support" | "menu_help";
  language?: "en" | "ja" | "vi";
}

export interface ChatResponse {
  response: string;
  language: string;
  confidence?: number;
}

class GeminiHelper {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error("Gemini API key is required");
    }

    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.model || "gemini-3.1-flash-preview",
    });
  }

  /**
   * Translate text to multiple languages for restaurant menus
   */
  async translateMenuText(
    request: TranslationRequest,
  ): Promise<TranslationResult> {
    const { text, sourceLanguage = "auto", context = "menu_item" } = request;

    const contextPrompts = {
      menu_item:
        "This is a restaurant menu item name. Provide accurate, appetizing translations.",
      topping:
        "This is a food topping or ingredient. Provide accurate culinary translations.",
      description:
        "This is a restaurant menu item description. Provide detailed, appetizing translations.",
      general:
        "This is general restaurant-related text. Provide accurate translations.",
    };

    const prompt = `
You are a professional restaurant menu translator with expertise in Vietnamese, Japanese, and English cuisine.

Context: ${contextPrompts[context]}
Text to translate: "${text}"
Source language: ${sourceLanguage}

Please provide translations in this exact JSON format (no additional text):
{
  "en": "English translation",
  "ja": "Japanese translation", 
  "vi": "Vietnamese translation"
}

Translation guidelines:
- For Japanese dishes, use proper Japanese names with accurate translations
- Keep culinary terms authentic and appetizing
- Use proper capitalization for menu items
- Ensure translations sound natural for restaurant menus
- If the source is already in one language, improve/refine it if needed
- Do not add furigana or romanization for Japanese
Text: "${text}"
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Extract JSON from the response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const translations = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!translations.en || !translations.ja || !translations.vi) {
        throw new Error("Incomplete translation response");
      }

      return translations as TranslationResult;
    } catch (error) {
      await logger.error("gemini-translation", "Gemini translation error", {
        error: error instanceof Error ? error.message : "Unknown error",
        text,
      });

      // Fallback to basic translation pattern
      return {
        en: `${text} (English)`,
        ja: `${text} (日本語)`,
        vi: text,
      };
    }
  }

  /**
   * Generate restaurant content using AI
   */
  async generateContent(
    prompt: string,
    context: string = "general",
  ): Promise<string> {
    const contextualPrompt = `
You are an AI assistant for a restaurant management system. 
Context: ${context}

${prompt}

Please provide a helpful, professional response in plain text.
`;

    try {
      const result = await this.model.generateContent(contextualPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      await logger.error(
        "gemini-content-generation",
        "Gemini content generation error",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw new Error("Failed to generate content");
    }
  }

  /**
   * Generate a single raster image. Gemini image models return image bytes as
   * inline data; callers own moderation, persistence, and fallback behavior.
   */
  async generateImage(
    prompt: string,
    context: string = "general",
  ): Promise<GeneratedImageResult> {
    const contextualPrompt = `
You are an AI image generation assistant for a restaurant operations platform.
Context: ${context}

${prompt}
`;

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: contextualPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      } as never);
      const response = await result.response;
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (part) => "inlineData" in part && part.inlineData,
      );

      if (
        !imagePart ||
        !("inlineData" in imagePart) ||
        !imagePart.inlineData?.data
      ) {
        throw new Error("No image returned from Gemini image model");
      }

      return {
        data: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || "image/png",
      };
    } catch (error) {
      await logger.error(
        "gemini-image-generation",
        "Gemini image generation error",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      );
      throw new Error("Failed to generate image");
    }
  }

  /**
   * Chat interface for owner/customer assistance (future feature)
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { message, context, language = "en" } = request;

    const contextPrompts = {
      owner_assistance:
        "You are helping a restaurant owner manage their business.",
      customer_support:
        "You are helping a restaurant customer with their experience.",
      menu_help:
        "You are helping with menu-related questions and recommendations.",
    };

    const languagePrompts = {
      en: "Respond in English.",
      ja: "Respond in Japanese (日本語).",
      vi: "Respond in Vietnamese (Tiếng Việt).",
    };

    const prompt = `
${contextPrompts[context]}
${languagePrompts[language]}

User message: "${message}"

Provide a helpful, professional response that assists with their restaurant-related needs.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;

      return {
        response: response.text(),
        language: language,
        confidence: 0.95, // Placeholder - Gemini doesn't provide confidence scores
      };
    } catch (error) {
      console.error("Gemini chat error:", error);
      throw new Error("Failed to process chat request");
    }
  }

  /**
   * Generate menu descriptions from item names
   */
  async generateMenuDescription(
    itemName: string,
    initialData: string,
    language: "en" | "ja" | "vi" = "en",
  ): Promise<DescriptionResult> {
    const languagePrompts = {
      en: "English",
      ja: "Japanese (日本語)",
      vi: "Vietnamese (Tiếng Việt)",
    };

    const prompt = `
You are a professional menu writer for restaurant operators.
Write practical menu descriptions in 3 languages: English, Japanese, and Vietnamese.
User's original language: ${languagePrompts[language]}
Dish name:  "${itemName}"
Description context from user:
${initialData}

Please provide descriptions in this exact JSON format (no additional text):
{
  "en": "English description",
  "ja": "Japanese description", 
  "vi": "Vietnamese description"
}

Guidelines:
- Keep each description concise (1-2 short sentences, max 28 words per language).
- Prioritize useful ingredient information: main protein/base, key sauce/seasoning, and cooking method.
- If the dish context does not clearly provide ingredients, do NOT invent specifics. Use neutral wording.
- Avoid generic marketing phrases like "delicious", "tasty", "perfect", "must-try", "mouth-watering".
- Do not include prices, promotions, availability, or nutrition claims.
- Keep wording operationally clear for menu management and customer understanding.

Dish name: "${itemName}"
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Extract JSON from the response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      const descriptions = JSON.parse(jsonMatch[0]);
      return descriptions;
    } catch (error) {
      console.error("Gemini description generation error:", error);
      return {
        en: `Description for "${itemName}" could not be generated at this time.`,
        ja: `「${itemName}」の説明は現在生成できません。`,
        vi: `Mô tả cho "${itemName}" hiện không thể tạo được.`,
      };
    }
  }

  /**
   * Generate restaurant descriptions from restaurant info
   */
  async generateRestaurantDescription(
    restaurantName: string,
    contextInfo: string,
    language: "en" | "ja" | "vi" = "en",
  ): Promise<DescriptionResult> {
    const languagePrompts = {
      en: "English",
      ja: "Japanese (日本語)",
      vi: "Vietnamese (Tiếng Việt)",
    };

    const prompt = `
You are a professional restaurant marketing writer.
Write compelling restaurant descriptions in 3 languages: English, Japanese, and Vietnamese.
User's original language: ${languagePrompts[language]}

Restaurant Information:
${contextInfo}

Please provide descriptions in this exact JSON format (no additional text):
{
  "en": "English description",
  "ja": "Japanese description", 
  "vi": "Vietnamese description"
}

Guidelines:
- Keep each description concise (3-4 sentences)
- Make it sound inviting and memorable
- Highlight unique features, atmosphere, and specialties
- Use appropriate cultural language for each market
- Avoid specific prices or hours
- Focus on the dining experience and quality

Restaurant: "${restaurantName}"
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Extract JSON from the response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      const descriptions = JSON.parse(jsonMatch[0]);
      return descriptions;
    } catch (error) {
      console.error("Gemini restaurant description generation error:", error);
      return {
        en: `Description for "${restaurantName}" could not be generated at this time.`,
        ja: `「${restaurantName}」の説明は現在生成できません。`,
        vi: `Mô tả cho "${restaurantName}" hiện không thể tạo được.`,
      };
    }
  }

  /**
   * Generate restaurant descriptions from restaurant info
   */
  async generateMenuItemNameDescTags(
    itemName: string,
    contextInfo: string,
    language: "en" | "ja" | "vi" = "en",
  ): Promise<MenuItemNameDescTags> {
    const languagePrompts = {
      en: "English",
      ja: "Japanese (日本語)",
      vi: "Vietnamese (Tiếng Việt)",
    };

    const prompt = `
You are a professional menu writer for restaurant operations.
Use the dish name and context to generate practical name + description in English, Japanese, and Vietnamese.

User's original language: ${languagePrompts[language]}
Dish name: "${itemName}"
Extra context:
${contextInfo}

## Guidelines:
### For Name:
- Keep names short, clear, and menu-ready.
- For Japanese dishes, use proper Japanese names with accurate translation intent.
- Use proper capitalization where language-appropriate.
- If source is already good in one language, refine rather than rewrite style aggressively.
- Don't add furigana or romanization for Japanese names.

### For Description:
- Keep concise (1-2 short sentences, max 28 words each language).
- Focus on useful information: main ingredients, primary seasoning/sauce, and cooking style.
- Prefer concrete nouns (e.g., chicken thigh, soy sauce, garlic, rice noodles) over generic adjectives.
- If context is uncertain, do not invent ingredients. Stay factual and neutral.
- Avoid generic marketing phrases: "delicious", "amazing", "must-try", "mouth-watering", "perfect".
- Don't include prices, availability, or promotional language.

### For Tags:
- Provide 3-5 specific tags focused on ingredient/cooking/category signals.
- Prefer tags like ingredient, method, cuisine, dietary signal (if explicit), spice level (if explicit).
- Do not output vague tags like "tasty", "good", "special".

Please provide output in this exact JSON format (no additional text):
{
  "name_en": "English menu item name",
  "name_ja": "Japanese menu item name",
  "name_vi": "Vietnamese menu item name",
  "description_en": "English description",
  "description_ja": "Japanese description",
  "description_vi": "Vietnamese description",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();
      // Extract JSON from the response
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      const descriptions = JSON.parse(jsonMatch[0]);
      return descriptions;
    } catch (error) {
      console.error("Gemini restaurant description generation error:", error);
      return {
        name_en: `Name for "${itemName}" could not be generated at this time.`,
        name_ja: `「${itemName}」の名前は現在生成できません。`,
        name_vi: `Tên cho "${itemName}" hiện không thể tạo được.`,
        description_en: `Description for "${itemName}" could not be generated at this time.`,
        description_ja: `「${itemName}」の説明は現在生成できません。`,
        description_vi: `Mô tả cho "${itemName}" hiện không thể tạo được.`,
        tags: ["restaurant", "menu", "food", "cuisine"],
        // Default tags, can be customized later
      };
    }
  }

  /**
   * Analyze menu item popularity and suggest improvements
   */
  async analyzeMenuItem(itemData: {
    name: string;
    description?: string;
    price: number;
    category: string;
    ratings?: number;
    orders?: number;
  }): Promise<{
    suggestions: string[];
    marketingTips: string[];
    pricingAdvice?: string;
  }> {
    const prompt = `
You are a restaurant business consultant analyzing a menu item.

Item Details:
- Name: ${itemData.name}
- Description: ${itemData.description || "No description"}
- Price: $${itemData.price}
- Category: ${itemData.category}
- Average Rating: ${itemData.ratings || "No ratings"}
- Total Orders: ${itemData.orders || "No data"}

Provide analysis in this JSON format:
{
  "suggestions": ["improvement suggestion 1", "improvement suggestion 2"],
  "marketingTips": ["marketing tip 1", "marketing tip 2"],
  "pricingAdvice": "pricing recommendation"
}

Focus on:
- Menu description improvements
- Pricing optimization
- Marketing positioning
- Ingredient highlights
- Presentation suggestions
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback response
      return {
        suggestions: [
          "Consider adding more descriptive language to the menu item",
        ],
        marketingTips: ["Highlight unique ingredients or cooking methods"],
        pricingAdvice: "Current pricing appears reasonable for the category",
      };
    } catch (error) {
      console.error("Gemini menu analysis error:", error);
      return {
        suggestions: ["Unable to analyze at this time"],
        marketingTips: ["Try updating the description"],
        pricingAdvice: "Review competitor pricing",
      };
    }
  }
}

// Factory function to create Gemini helper instance
export function createGeminiHelper(
  config?: Partial<GeminiConfig>,
): GeminiHelper {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  const model =
    config?.model ||
    process.env.GEMINI_MODEL ||
    process.env.NEXT_PUBLIC_GEMINI_MODEL;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  return new GeminiHelper({
    apiKey,
    model,
  });
}

export function createGeminiImageHelper(
  config?: Partial<GeminiConfig>,
): GeminiHelper {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
  const model =
    config?.model ||
    process.env.GEMINI_IMAGE_MODEL ||
    process.env.NEXT_PUBLIC_GEMINI_IMAGE_MODEL;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }

  if (!model) {
    throw new Error(
      "NEXT_PUBLIC_GEMINI_IMAGE_MODEL environment variable is required",
    );
  }

  return new GeminiHelper({
    apiKey,
    model,
  });
}

// Export the main class
export { GeminiHelper };

// Default export for convenience
export default GeminiHelper;
