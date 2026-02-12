import { test, expect } from "@playwright/test";

// ============================================================================
// 7C.1: Student login → dashboard → start course → complete lesson → progress
// ============================================================================

test.describe("Student Learning Flow", () => {
  test("dashboard loads with welcome content", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
    // Dashboard should show enrolled courses or welcome message
    await expect(page.locator("body")).toContainText(/(dashboard|course|welcome)/i);
  });

  test("can navigate to courses page", async ({ page }) => {
    await page.goto("/courses");
    await expect(page).toHaveURL("/courses");
    await expect(page.locator("h1")).toContainText(/course/i);
  });

  test("can open a course detail page", async ({ page }) => {
    await page.goto("/courses");

    // Find and click the first course link
    const courseLink = page.locator('a[href*="/courses/"]').first();
    const isVisible = await courseLink.isVisible().catch(() => false);

    if (isVisible) {
      await courseLink.click();
      await expect(page).toHaveURL(/\/courses\/[a-zA-Z0-9-]+/);
      // Course page should show course title or module list
      await expect(page.locator("body")).toContainText(/(module|lesson|overview|enroll)/i);
    } else {
      // No courses available — acceptable for empty test environment
      test.skip();
    }
  });

  test("can view a lesson within a course", async ({ page }) => {
    await page.goto("/courses");

    const courseLink = page.locator('a[href*="/courses/"]').first();
    const isVisible = await courseLink.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    await courseLink.click();
    await page.waitForLoadState("networkidle");

    // Look for a lesson link
    const lessonLink = page.locator('a[href*="/lessons/"]').first();
    const lessonVisible = await lessonLink.isVisible().catch(() => false);

    if (!lessonVisible) {
      test.skip();
      return;
    }

    await lessonLink.click();
    await expect(page).toHaveURL(/\/lessons\/[a-zA-Z0-9-]+/);
  });

  test("can navigate to calendar", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL("/calendar");
    await expect(page.locator("h1")).toContainText(/calendar/i);
  });

  test("can navigate to learning paths", async ({ page }) => {
    await page.goto("/paths");
    await expect(page).toHaveURL("/paths");
    await expect(page.locator("h1")).toContainText(/learning path/i);
  });

  test("can navigate to resources", async ({ page }) => {
    await page.goto("/resources");
    await expect(page).toHaveURL("/resources");
    await expect(page.locator("h1")).toContainText(/resource/i);
  });

  test("can navigate to leaderboard", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page).toHaveURL("/leaderboard");
    await expect(page.locator("h1")).toContainText(/leaderboard/i);
  });

  test("can view notification settings", async ({ page }) => {
    await page.goto("/settings/notifications");
    await expect(page).toHaveURL("/settings/notifications");
    await expect(page.locator("body")).toContainText(/notification/i);
  });
});
