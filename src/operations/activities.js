import OpenAI from "openai";
import { HttpError } from "wasp/server";

export const getActivities = async ({ location, date, timeOfDay, interests = [] }, context) => {
    // Check if this is specifically a clubbing/nightlife request in Mumbai
    const isMumbaiClubbing =
        interests.some(
            (interest) =>
                interest.toLowerCase().includes("club") ||
                interest.toLowerCase().includes("nightlife") ||
                interest.toLowerCase().includes("bar") ||
                interest.toLowerCase().includes("party"),
        ) && location.toLowerCase().includes("mumbai");

    console.log("getActivities called with params:", { location, date, timeOfDay, interests });
    console.log("getActivities context:", context);
    console.log("context.user exists:", !!context?.user);
    console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
    console.log("Is Mumbai clubbing request?", isMumbaiClubbing);

    if (!context.user) throw new HttpError(401, "Not authenticated");
    if (!process.env.OPENAI_API_KEY) throw new HttpError(500, "OpenAI key missing");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (isMumbaiClubbing) {
        // Return hardcoded Mumbai clubs with real booking links
        const mumbaiClubs = [
            {
                id: 1,
                title: "Trilogy",
                subtitle: "Premium nightclub at The Hilton Mumbai International Airport",
                timing: "9:00 PM - 3:00 AM",
                price: "₹2000",
                bookingUrl: "https://www.zomato.com/mumbai/trilogy-sahar/info",
                externalLinks: [
                    { label: "Zomato", url: "https://www.zomato.com/mumbai/trilogy-sahar/info" },
                ],
            },
            {
                id: 2,
                title: "Kitty Su",
                subtitle: "Upscale club at The Lalit Mumbai",
                timing: "9:30 PM - 3:00 AM",
                price: "₹1800",
                bookingUrl: "https://www.zomato.com/mumbai/kitty-su-andheri-east/info",
                externalLinks: [
                    {
                        label: "Zomato",
                        url: "https://www.zomato.com/mumbai/kitty-su-andheri-east/info",
                    },
                ],
            },
            {
                id: 3,
                title: "Bonobo",
                subtitle: "Popular club in Bandra West with great music",
                timing: "8:00 PM - 2:00 AM",
                price: "₹1500",
                bookingUrl: "https://www.zomato.com/mumbai/bonobo-bandra-west/info",
                externalLinks: [
                    {
                        label: "Zomato",
                        url: "https://www.zomato.com/mumbai/bonobo-bandra-west/info",
                    },
                ],
            },
            {
                id: 4,
                title: "Toto's Garage",
                subtitle: "Rock bar in Bandra with live music and drinks",
                timing: "7:00 PM - 1:30 AM",
                price: "₹1200",
                bookingUrl: "https://www.zomato.com/mumbai/totos-garage-bandra-west/info",
                externalLinks: [
                    {
                        label: "Zomato",
                        url: "https://www.zomato.com/mumbai/totos-garage-bandra-west/info",
                    },
                ],
            },
            {
                id: 5,
                title: "Antisocia",
                subtitle: "Trendy club in Khar West with DJ nights",
                timing: "8:30 PM - 2:30 AM",
                price: "₹1600",
                bookingUrl: "https://www.zomato.com/mumbai/antisocial-khar-west/info",
                externalLinks: [
                    {
                        label: "Zomato",
                        url: "https://www.zomato.com/mumbai/antisocial-khar-west/info",
                    },
                ],
            },
        ];

        console.log("Returning hardcoded Mumbai clubs:", mumbaiClubs);
        return mumbaiClubs;
    }

    // AI-generated activities for all non-Mumbai-clubbing requests
    const interestPrompt =
        interests.length > 0
            ? `The traveler is specifically interested in: ${interests.join(", ")}. Focus ALL recommendations around these specific interests.`
            : "";

    const prompt = `You are a knowledgeable local travel expert for ${location}. Suggest 5 REAL, SPECIFIC venues/activities for a traveler on ${date} during the ${timeOfDay}. ${interestPrompt}

IMPORTANT REQUIREMENTS:
- Use actual venue names, addresses, and real business information
- For restaurants: Use real restaurant names, not generic "Local Restaurant"
- For museums/attractions: Use actual museum/site names
- For activities: Use real tour companies, activity centers, or venues
- Include realistic pricing in local currency
- Provide actual business websites, booking platforms, or contact information
- Timing should reflect actual operating hours

Examples of GOOD responses:
- "Louvre Museum" (not "Famous Art Museum")
- "Joe's Pizza Brooklyn" (not "Popular Pizza Place")
- "Central Park Bike Tours by Bike Rental Central Park" (not "Bike Tour Experience")

Return pure JSON array, each object with id,title,subtitle,timing,price,bookingUrl,externalLinks.`;

    console.log("About to call OpenAI with prompt:", prompt);

    const resp = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.2, // Very low temperature for consistent, factual results
        messages: [
            {
                role: "system",
                content:
                    "You are a knowledgeable travel expert. You respond only with valid JSON containing actual, real venues and businesses. Never use generic placeholder names.",
            },
            { role: "user", content: prompt },
        ],
    });

    console.log("OpenAI response received:", resp);
    console.log("OpenAI response choices:", resp.choices);
    console.log("OpenAI response message:", resp.choices[0]?.message);

    const text = resp.choices[0].message.content.trim();
    console.log("OpenAI raw text response:", text);

    let data;
    try {
        data = JSON.parse(text);
        console.log("Successfully parsed JSON:", data);
    } catch (e) {
        console.error("OpenAI returned invalid JSON. Raw text:", text);
        console.error("JSON parse error:", e.message);
        throw new HttpError(500, "AI response error: Invalid JSON format");
    }
    return data;
};
