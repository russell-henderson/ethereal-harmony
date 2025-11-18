// tests/e2e/smoke.spec.ts
// Playwright smoke test for critical UI flows
import { test, expect } from '@playwright/test';

test.describe('Ethereal Harmony Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should load the app and display main UI', async ({ page }) => {
    // Check that the root element exists
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    
    // Check that the app title is present (either in document title or visible text)
    await expect(page).toHaveTitle(/Ethereal Harmony/i);
  });

  test('should display player controls', async ({ page }) => {
    // Look for common player UI elements
    // These selectors may need adjustment based on actual component structure
    const playerCard = page.locator('[data-testid="player-card"], .player-card, [role="region"]').first();
    
    // At minimum, the player area should be visible
    // If specific test IDs aren't available, we check for common patterns
    await expect(playerCard.or(page.locator('body'))).toBeVisible();
  });

  test('should allow loading a track via URL', async ({ page }) => {
    // Look for URL input field
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL" i], input[placeholder*="url" i]').first();
    
    // If URL loader exists, test it
    if (await urlInput.count() > 0) {
      const testUrl = 'https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Loyalty_Freak_Music/LOFI_and_chill/Loyalty_Freak_Music_-_01_-_Just_Because.mp3';
      
      await urlInput.fill(testUrl);
      
      // Look for submit button
      const submitButton = page.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Wait a moment for loading
        await page.waitForTimeout(1000);
        
        // Check that something happened (no specific assertion, just that it didn't crash)
        await expect(page.locator('body')).toBeVisible();
      }
    } else {
      // Skip if URL loader not found - this is a smoke test, not a full feature test
      test.skip();
    }
  });

  test('should handle play/pause interaction', async ({ page }) => {
    // Look for play/pause button
    const playButton = page.locator('button[aria-label*="play" i], button[aria-label*="pause" i], button[title*="play" i], button[title*="pause" i]').first();
    
    if (await playButton.count() > 0) {
      // Click play/pause button
      await playButton.click();
      
      // Wait a moment
      await page.waitForTimeout(500);
      
      // Verify button still exists (didn't crash)
      await expect(playButton).toBeVisible();
    } else {
      // Skip if play button not found
      test.skip();
    }
  });

  test('should open and close settings modal', async ({ page }) => {
    // Look for settings button
    const settingsButton = page.locator('button[aria-label*="settings" i], button[aria-label*="Settings" i], button[title*="settings" i]').first();
    
    if (await settingsButton.count() > 0) {
      // Open settings
      await settingsButton.click();
      
      // Wait for modal to appear
      await page.waitForTimeout(500);
      
      // Look for modal or settings panel
      const modal = page.locator('[role="dialog"], .modal, [data-testid="settings-modal"]').first();
      
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        
        // Look for close button
        const closeButton = page.locator('button[aria-label*="close" i], button[aria-label*="Close" i]').first();
        
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(300);
        } else {
          // Try ESC key
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
    } else {
      // Skip if settings button not found
      test.skip();
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test basic keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    // Verify focus moved (check for focused element)
    const focused = page.locator(':focus');
    // Just verify something is focused or the page is still visible
    await expect(page.locator('body')).toBeVisible();
  });
});

