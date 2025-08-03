import { test, expect } from '@playwright/test';

test.describe('vibe page tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vibe');
  });

  test('displays Player, Code, AI elements', async ({ page }) => {
    // Check that Player button is visible
    await expect(page.getByRole('button', { name: 'Player' })).toBeVisible();
    
    // Check that Code button is visible
    await expect(page.getByRole('button', { name: 'Code' })).toBeVisible();
    
    // Check that textarea exists (for AI input)
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('left panel menu button is clickable', async ({ page }) => {
    // Check that the left panel menu button is visible and clickable
    const leftPanelButton = page.getByTestId('left-panel-menu-button');
    await expect(leftPanelButton).toBeVisible();
    await expect(leftPanelButton).toBeEnabled();
    
    // Test that the button is actually clickable
    await leftPanelButton.click();
  });

  test('left panel menu: reset works', async ({ page }) => {
    // Click the left panel menu button
    const leftPanelButton = page.getByTestId('left-panel-menu-button');
    await expect(leftPanelButton).toBeVisible();
    await leftPanelButton.click();
    
    // Click the reset project button
    const resetButton = page.getByTestId('reset-project-button');
    await expect(resetButton).toBeVisible();
    await resetButton.click();
    
    // Handle the confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    
    // Wait a moment for the reset to complete
    await page.waitForTimeout(1000);
    
    // Check localStorage for the reset project state
    const projectData = await page.evaluate(() => {
      const project = localStorage.getItem('vibe-project');
      if (!project) return null;

      const parsedProject = JSON.parse(project);
      return {
        pagesLength: parsedProject?.composition?.pages?.length || 0,
        firstPageElementsLength: parsedProject?.composition?.pages?.[0]?.elements?.length || 0
      };
    });

    // Verify the reset state: should have 1 page with 1 element
    expect(projectData).not.toBeNull();
    expect(projectData.pagesLength).toBe(1);
    expect(projectData.firstPageElementsLength).toBe(0);
  });
});