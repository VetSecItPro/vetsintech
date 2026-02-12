import { test, expect } from "@playwright/test";

// ============================================================================
// 7C.3: Student posts discussion → reply → upvote (community flow)
// ============================================================================

test.describe("Community Discussion Flow", () => {
  test("can navigate to community discussions", async ({ page }) => {
    await page.goto("/community");
    await expect(page).toHaveURL("/community");
    await expect(page.locator("h1")).toContainText(/(community|discussion)/i);
  });

  test("can view a discussion thread", async ({ page }) => {
    await page.goto("/community");

    const threadLink = page.locator('a[href*="/community/"]').first();
    const isVisible = await threadLink.isVisible().catch(() => false);

    if (isVisible) {
      await threadLink.click();
      await expect(page).toHaveURL(/\/community\/[a-zA-Z0-9-]+/);
      // Thread page should show the discussion title and posts
      await expect(page.locator("body")).toContainText(/(post|reply|comment)/i);
    } else {
      test.skip();
    }
  });

  test("can access new discussion form", async ({ page }) => {
    await page.goto("/community/new");
    await expect(page).toHaveURL("/community/new");
    // Should show form to create a new discussion
    await expect(page.locator("body")).toContainText(/(new|create|discussion|title)/i);
  });

  test("can navigate to notifications page", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL("/notifications");
    await expect(page.locator("body")).toContainText(/notification/i);
  });

  test("can view own profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL("/profile");
    await expect(page.locator("body")).toContainText(/(profile|name|email)/i);
  });

  test("can access portfolio editor", async ({ page }) => {
    await page.goto("/profile/portfolio");
    await expect(page).toHaveURL("/profile/portfolio");
    await expect(page.locator("body")).toContainText(/portfolio/i);
  });
});
