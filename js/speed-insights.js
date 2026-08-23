/**
 * Vercel Speed Insights Integration
 * 
 * This module initializes Vercel Speed Insights for performance monitoring.
 * Speed Insights automatically collects Web Vitals and other performance metrics.
 */
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
// The script will automatically track performance metrics when deployed to Vercel
injectSpeedInsights({
  // Enable debug mode in development (shows console logs)
  debug: true,
  // Sample rate: 1 = track 100% of page loads
  sampleRate: 1
});
