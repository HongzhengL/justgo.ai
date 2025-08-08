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

    console.log("=== DEBUG getActivities ===");
    console.log("getActivities called with params:", { location, date, timeOfDay, interests });
    console.log("Interests array:", interests);
    console.log("Interests length:", interests.length);
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
    const isRestaurantSearch = interests.some(
        (interest) =>
            interest.toLowerCase().includes("restaurant") ||
            interest.toLowerCase().includes("dining") ||
            interest.toLowerCase().includes("food") ||
            interest.toLowerCase().includes("cuisine"),
    );

    console.log("=== CUISINE DETECTION DEBUG ===");
    console.log("Is restaurant search:", isRestaurantSearch);
    console.log("Interests:", interests);

    const interestPrompt =
        interests.length > 0
            ? `The traveler is specifically interested in: ${interests.join(", ")}. Focus ALL recommendations around these specific interests.`
            : "";

    // Special handling for restaurant searches with cuisine types
    const cuisineTypes = [
        "indian",
        "italian",
        "chinese",
        "japanese",
        "thai",
        "mexican",
        "french",
        "korean",
        "vietnamese",
        "mediterranean",
        "greek",
        "spanish",
        "american",
        "seafood",
        "steakhouse",
        "vegetarian",
        "vegan",
        "sushi",
        "pizza",
        "burgers",
        "bbq",
        "barbecue",
        "german",
    ];

    const hasCuisineType = interests.some((interest) =>
        cuisineTypes.some((cuisine) => interest.toLowerCase().includes(cuisine)),
    );

    console.log("Has cuisine type:", hasCuisineType);
    console.log(
        "Cuisine types found:",
        cuisineTypes.filter((cuisine) =>
            interests.some((interest) => interest.toLowerCase().includes(cuisine)),
        ),
    );

    const searchTypePrompt = isRestaurantSearch
        ? `IMPORTANT: This is a RESTAURANT SEARCH. ${hasCuisineType ? 'ONLY suggest restaurants that match the specific cuisine type requested. For example, if they ask for "German restaurants", only suggest actual German restaurants with authentic German cuisine.' : ""} Only suggest actual restaurants, cafes, or dining establishments. Do not include tourist attractions, museums, or general activities.`
        : "";

    const prompt = `You are a knowledgeable local travel expert for ${location}. Suggest 5 REAL, SPECIFIC venues/activities for a traveler on ${date} during the ${timeOfDay}. ${interestPrompt}

${searchTypePrompt}

IMPORTANT REQUIREMENTS:
- Use actual venue names, addresses, and real business information
- For restaurants: Use real restaurant names that exist in ${location}
- For museums/attractions: Use actual museum/site names
- For activities: Use real tour companies, activity centers, or venues
- Include realistic pricing in local currency
- For booking URLs, use ONLY these reliable platforms:
  * For restaurants: Use Zomato, OpenTable, or Google Maps links
  * For activities: Use GetYourGuide, Viator, or official venue websites
- Timing should reflect actual operating hours

${
    isRestaurantSearch
        ? `CRITICAL for restaurant bookings:
- For INDIAN cities (Mumbai, Delhi, Bangalore, etc.): Use Zomato links like "https://www.zomato.com/mumbai/restaurant-name"
- For US cities: Use Google Maps search like "https://www.google.com/maps/search/restaurant+name+city" 
- For European cities: Use Google Maps search
- Do NOT create fake OpenTable, Zomato, or restaurant website links
- Use real restaurant names that exist in ${location}
- Examples: 
  * India: "https://www.zomato.com/mumbai/trishna-fort"
  * US: "https://www.google.com/maps/search/Gramercy+Tavern+New+York"
  * Europe: "https://www.google.com/maps/search/Le+Comptoir+du+Relais+Paris"`
        : `Examples of GOOD responses:
- "Louvre Museum" (not "Famous Art Museum") 
- "Joe's Pizza Brooklyn" (not "Popular Pizza Place")
- "Central Park Bike Tours by Bike Rental Central Park" (not "Bike Tour Experience")`
}

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

    // Fix booking URLs if they're fake or broken
    if (isRestaurantSearch) {
        console.log("Fixing restaurant booking URLs...");
        data = data.map((item) => {
            // Create a reliable fallback booking URL
            let fallbackUrl;
            const locationLower = location.toLowerCase();

            // Only use Zomato for Indian cities
            if (
                locationLower.includes("mumbai") ||
                locationLower.includes("delhi") ||
                locationLower.includes("bangalore") ||
                locationLower.includes("chennai") ||
                locationLower.includes("kolkata") ||
                locationLower.includes("hyderabad") ||
                locationLower.includes("pune") ||
                locationLower.includes("ahmedabad") ||
                locationLower.includes("india")
            ) {
                // For Indian cities, use Zomato search
                const restaurantSlug = item.title
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "");
                fallbackUrl = `https://www.zomato.com/${locationLower.includes("mumbai") ? "mumbai" : "delhi"}/${restaurantSlug}`;
            } else {
                // For all other cities (US, Europe, etc.), use Google Maps search
                const searchQuery = encodeURIComponent(`${item.title} ${location} restaurant`);
                fallbackUrl = `https://www.google.com/maps/search/${searchQuery}`;
            }

            // Check if the bookingUrl is inappropriate for the location
            const isFakeUrl =
                !item.bookingUrl ||
                item.bookingUrl.includes("localhost") ||
                item.bookingUrl.includes("example.com") ||
                item.bookingUrl.includes("placeholder") ||
                item.bookingUrl.includes("restaurant-name") ||
                item.bookingUrl.length < 10 ||
                !item.bookingUrl.startsWith("http");

            // IMPORTANT: Also replace inappropriate URLs for the location
            const isZomatoForNonIndianCity =
                item.bookingUrl.includes("zomato.com") &&
                !(
                    locationLower.includes("mumbai") ||
                    locationLower.includes("delhi") ||
                    locationLower.includes("bangalore") ||
                    locationLower.includes("chennai") ||
                    locationLower.includes("kolkata") ||
                    locationLower.includes("hyderabad") ||
                    locationLower.includes("pune") ||
                    locationLower.includes("ahmedabad") ||
                    locationLower.includes("india")
                );

            // Also replace OpenTable URLs since they often lead to 404s for non-existent restaurants
            const isOpenTableUrl = item.bookingUrl.includes("opentable.com");

            if (isFakeUrl || isZomatoForNonIndianCity || isOpenTableUrl) {
                const reason = isZomatoForNonIndianCity
                    ? "inappropriate Zomato"
                    : isOpenTableUrl
                      ? "OpenTable"
                      : "fake";
                console.log(
                    `Replacing ${reason} URL for ${item.title}: ${item.bookingUrl || "none"} -> ${fallbackUrl}`,
                );
                item.bookingUrl = fallbackUrl;
            }

            return item;
        });
    }

    return data;
};
