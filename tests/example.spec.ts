import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Inventory Management/);
});

test('dashboard is accessible', async ({ page }) => {
  await page.goto('/');
  // Wait for the page to load
  await page.waitForSelector('body');
  
  // Check if the main content is visible
  await expect(page.locator('body')).toBeVisible();
});