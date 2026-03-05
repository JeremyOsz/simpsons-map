import { expect, test } from "@playwright/test";

test("heatmap loads and country panel opens", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Simpsons Country Mentions Explorer")).toBeVisible();
  await expect(page.locator(".map-canvas")).toBeVisible();
});

test("search and filters are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("Search country, quote, or S05E14")).toBeVisible();
  await expect(page.getByLabel("Confidence")).toBeVisible();
  await expect(page.getByLabel("Source")).toBeVisible();
});
