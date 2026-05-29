/**
 * Robust, state-of-the-art JSON parser designed to safely parse LLM outputs.
 * Extracts JSON blocks from markdown enclosures, removes trailing commas,
 * corrects common formatting quirks, and falls back to regex key-value extraction
 * to prevent application crashes under any circumstances.
 */
export function safeJsonParse(text: string): any {
  if (!text) {
    throw new Error("Cannot parse empty or undefined text");
  }

  let cleanText = text.trim();

  // 1. Try to extract content inside markdown json/code blocks
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleanText.match(jsonBlockRegex);
  if (match && match[1]) {
    cleanText = match[1].trim();
  }

  // 2. Extract strictly from the first '{' or '[' to the last '}' or ']'
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');

  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && lastBrace !== -1) {
    if (firstBracket !== -1 && firstBracket < firstBrace && lastBracket !== -1 && lastBracket > lastBrace) {
      startIndex = firstBracket;
      endIndex = lastBracket;
    } else {
      startIndex = firstBrace;
      endIndex = lastBrace;
    }
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    startIndex = firstBracket;
    endIndex = lastBracket;
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    cleanText = cleanText.substring(startIndex, endIndex + 1).trim();
  }

  // 3. Clean up common JSON syntax quirks produced by LLMs
  cleanText = cleanText
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas before closing braces/brackets
    .replace(/(["'])\s*:\s*undefined/gi, '$1: null') // Standardize undefined to null
    .replace(/(["'])\s*:\s*NaN/gi, '$1: null'); // Standardize NaN to null

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.warn("[JSON Parser] Standard JSON.parse failed. Attempting advanced cleanup...", err);

    // ── Advanced Cleanup 1: Repair escaped quotes ──
    try {
      const repaired = cleanText.replace(/\\"/g, '"');
      return JSON.parse(repaired);
    } catch {
      // ── Advanced Cleanup 2: Resilient Regex Extraction Fallback ──
      console.warn("[JSON Parser] Parsing crashed. Executing regex-based key-value extraction fallback.");
      
      const result: Record<string, any> = {};
      
      // Extract string key-values: "key": "value"
      const stringMatches = cleanText.matchAll(/"([^"]+)"\s*:\s*"([^"]*)"/g);
      for (const m of stringMatches) {
        result[m[1]] = m[2];
      }

      // Extract numeric key-values: "key": 12.34
      const numMatches = cleanText.matchAll(/"([^"]+)"\s*:\s*(-?\d+(?:\.\d+)?)/g);
      for (const m of numMatches) {
        result[m[1]] = parseFloat(m[2]);
      }

      // Extract boolean key-values: "key": true
      const boolMatches = cleanText.matchAll(/"([^"]+)"\s*:\s*(true|false)/gi);
      for (const m of boolMatches) {
        result[m[1]] = m[2].toLowerCase() === 'true';
      }

      if (Object.keys(result).length > 0) {
        return result;
      }

      throw new Error(`Robust JSON Parsing failed completely for text: ${text}`);
    }
  }
}
