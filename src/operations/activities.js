import OpenAI from 'openai';
import { HttpError } from 'wasp/server';

export const getActivities = async ({ location, date, timeOfDay }, context) => {
  if (!context.user) throw new HttpError(401, 'Not authenticated');
  if (!process.env.OPENAI_API_KEY) throw new HttpError(500, 'OpenAI key missing');

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `You are a helpful travel assistant. Suggest 5 fun activities for a traveler in ${location} on ${date} during the ${timeOfDay}. Return pure JSON array, each object with id,title,subtitle,timing,price(optional),externalLinks(array label+url).`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-0125',
    temperature: 0.7,
    messages: [
      { role: 'system', content: 'You respond only with valid JSON.' },
      { role: 'user', content: prompt }
    ]
  });

  const text = resp.choices[0].message.content.trim();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('OpenAI returned invalid JSON', text);
    throw new HttpError(500, 'AI response error');
  }
  return data;
}; 