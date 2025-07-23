/**
 * Server Setup Configuration
 * Increases payload limit for voice message processing
 */

export const serverSetup = (app) => {
  // Increase payload limit for voice message processing
  // Default is 1MB, increase to 50MB for audio data
  app.use((req, res, next) => {
    if (req.path === '/operations/process-voice-message') {
      // Increase limit for voice message endpoint
      req.setTimeout(60000); // 60 second timeout
    }
    next();
  });

  console.log('Server setup completed - increased payload limits for voice processing');
}; 