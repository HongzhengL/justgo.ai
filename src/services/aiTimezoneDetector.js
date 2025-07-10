import OpenAI from "openai";
import { isValidTimezone } from "../utils/timezoneParser.js";

class AITimezoneDetector {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.model = "gpt-4o";
        this.temperature = 0.1;
    }

    generateTimezonePrompt() {
        return `Analyze the user message and extract any timezone information mentioned. Return ONLY a valid JSON object (no markdown formatting) with this structure:

{
  "timezone": "IANA_timezone_name_or_null"
}

Rules:
1. If a timezone is mentioned, convert it to a valid IANA timezone name (e.g., "PST" → "America/Los_Angeles", "EST" → "America/New_York")
2. If no timezone is mentioned, return {"timezone": null}
3. Common abbreviations: PST/PDT→America/Los_Angeles, MST/MDT→America/Denver, CST/CDT→America/Chicago, EST/EDT→America/New_York
4. City names: NYC/New York→America/New_York, LA/Los Angeles→America/Los_Angeles, London→Europe/London, Tokyo→Asia/Tokyo
5. UTC offsets: UTC+8→Asia/Shanghai, UTC-5→America/New_York, UTC+0→UTC
6. If timezone is ambiguous or invalid, return {"timezone": null}

Examples:
- "I'm in PST" → {"timezone": "America/Los_Angeles"}
- "My timezone is EST" → {"timezone": "America/New_York"}
- "I'm in New York" → {"timezone": "America/New_York"}
- "Currently in UTC+8" → {"timezone": "Asia/Shanghai"}
- "Hello there" → {"timezone": null}

IMPORTANT: Return only valid JSON without any markdown code block formatting or explanatory text.`;
    }

    async detectTimezone(message) {
        try {
            if (!message || typeof message !== "string" || message.trim().length === 0) {
                return null;
            }

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                temperature: this.temperature,
                messages: [
                    {
                        role: "system",
                        content: this.generateTimezonePrompt(),
                    },
                    {
                        role: "user",
                        content: message,
                    },
                ],
            });

            const responseText = completion.choices[0]?.message?.content?.trim();
            if (!responseText) {
                return null;
            }

            const parsedResponse = JSON.parse(responseText);
            const detectedTimezone = parsedResponse.timezone;

            if (!detectedTimezone || detectedTimezone === null) {
                console.log("AI timezone detection: No timezone detected in message");
                return null;
            }

            if (!isValidTimezone(detectedTimezone)) {
                console.warn(
                    `AI timezone detection: Invalid timezone detected: ${detectedTimezone}`,
                );
                return null;
            }

            console.log(
                `AI timezone detection: Successfully detected timezone: ${detectedTimezone}`,
            );
            return detectedTimezone;
        } catch (error) {
            console.error("Error in AI timezone detection:", error);
            return null;
        }
    }
}

export default AITimezoneDetector;
