import { test, expect } from "@playwright/test";

// ============================================================================
// Smoke tests — verify the app loads and public pages are accessible
// ============================================================================

test.describe("Smoke Tests", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toContainText(/sign in/i);
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("body")).toContainText(/sign up|create.*account|register/i);
  });

  test("public homepage loads", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("body")).toBeVisible();
  });

  test("public catalog loads", async ({ page }) => {
    await page.goto("/catalog");
    await expect(page.locator("body")).toContainText(/catalog|course/i);
  });

  test("about page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("body")).toContainText(/about/i);
  });
});
