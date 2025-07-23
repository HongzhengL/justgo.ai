import OpenAI from 'openai';
import { HttpError } from 'wasp/server';

export const processVoiceMessage = async ({ audioBlob }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User not authenticated');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new HttpError(500, 'OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(audioBlob, 'base64');
    
    // Create a temporary file with .webm extension
    const tempFile = new File([buffer], 'audio.webm', { type: 'audio/webm' });

    console.log('Sending file to OpenAI:', {
      name: tempFile.name,
      type: tempFile.type,
      size: tempFile.size
    });

    const response = await openai.audio.transcriptions.create({
      file: tempFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'json'
    });

    console.log('Transcription response:', response);

    return {
      text: response.text,
      success: true
    };
  } catch (error) {
    console.error('Transcription error:', error);
    
    if (error.response?.status === 401) {
      throw new HttpError(401, 'Invalid OpenAI API key');
    }

    if (error.response?.status === 429) {
      throw new HttpError(429, 'OpenAI API rate limit exceeded');
    }

    if (error.response?.status === 400) {
      return {
        text: "Sorry, there was an issue with the audio. Please try again.",
        success: false,
        error: error.message
      };
    }

    return {
      text: "I didn't quite catch that, could you try again?",
      success: false,
      error: error.message
    };
  }
};

/**
 * Validate audio data before processing
 * @param {string} audioData - Base64 encoded audio
 * @returns {boolean}
 */
export const validateAudioData = (audioData) => {
    if (!audioData || typeof audioData !== 'string') {
        return false;
    }

    // Check if it's valid base64
    try {
        const buffer = Buffer.from(audioData, 'base64');
        
        // Check size (max 25MB for Whisper API)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (buffer.length > maxSize) {
            return false;
        }

        // Check minimum size (at least 1KB)
        if (buffer.length < 1024) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}; 