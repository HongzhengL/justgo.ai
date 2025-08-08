import OpenAI from 'openai';
import { HttpError } from 'wasp/server';

export const getActivities = async ({ location, date, timeOfDay }, context) => {
  console.log('getActivities called with params:', { location, date, timeOfDay });
  console.log('getActivities context:', context);
  console.log('context.user exists:', !!context?.user);
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
  
  if (!context.user) throw new HttpError(401, 'Not authenticated');
  if (!process.env.OPENAI_API_KEY) throw new HttpError(500, 'OpenAI key missing');

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `You are a helpful travel assistant. Suggest 5 fun activities for a traveler in ${location} on ${date} during the ${timeOfDay}. For each activity, also provide a realistic booking website URL where travelers can book this activity. Return pure JSON array, each object with id,title,subtitle,timing,price(optional),bookingUrl(string),externalLinks(array label+url).`;

  console.log('About to call OpenAI with prompt:', prompt);
  
  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    temperature: 0.7,
    messages: [
      { role: 'system', content: 'You respond only with valid JSON.' },
      { role: 'user', content: prompt }
    ]
  });

  console.log('OpenAI response received:', resp);
  console.log('OpenAI response choices:', resp.choices);
  console.log('OpenAI response message:', resp.choices[0]?.message);

  const text = resp.choices[0].message.content.trim();
  console.log('OpenAI raw text response:', text);
  
  let data;
  try {
    data = JSON.parse(text);
    console.log('Successfully parsed JSON:', data);
  } catch (e) {
    console.error('OpenAI returned invalid JSON. Raw text:', text);
    console.error('JSON parse error:', e.message);
    throw new HttpError(500, 'AI response error: Invalid JSON format');
  }
  return data;
}; 