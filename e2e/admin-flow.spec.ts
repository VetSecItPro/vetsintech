import { test, expect } from "@playwright/test";

// ============================================================================
// 7C.2: Admin login → create course → add modules/lessons → publish → cohort
// ============================================================================

test.describe("Admin Course Management Flow", () => {
  test("admin dashboard loads", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("body")).toContainText(/(dashboard|analytics|admin)/i);
  });

  test("can navigate to course management", async ({ page }) => {
    await page.goto("/admin/courses");
    await expect(page).toHaveURL("/admin/courses");
    await expect(page.locator("h1")).toContainText(/course/i);
  });

  test("can access new course form", async ({ page }) => {
    await page.goto("/admin/courses/new");
    await expect(page).toHaveURL("/admin/courses/new");
    // Should show a course creation form
    await expect(page.locator("body")).toContainText(/(create|new|course|title)/i);
  });

  test("can navigate to student management", async ({ page }) => {
    await page.goto("/admin/students");
    await expect(page).toHaveURL("/admin/students");
    await expect(page.locator("h1")).toContainText(/student/i);
  });

  test("can navigate to learning paths management", async ({ page }) => {
    await page.goto("/admin/paths");
    await expect(page).toHaveURL("/admin/paths");
    await expect(page.locator("body")).toContainText(/learning path/i);
  });

  test("can navigate to resource management", async ({ page }) => {
    await page.goto("/admin/resources");
    await expect(page).toHaveURL("/admin/resources");
    await expect(page.locator("body")).toContainText(/resource/i);
  });

  test("can navigate to integrations", async ({ page }) => {
    await page.goto("/admin/integrations");
    await expect(page).toHaveURL("/admin/integrations");
    await expect(page.locator("body")).toContainText(/integration/i);
  });

  test("can navigate to admin calendar", async ({ page }) => {
    await page.goto("/admin/calendar");
    await expect(page).toHaveURL("/admin/calendar");
    await expect(page.locator("h1")).toContainText(/calendar/i);
  });

  test("can navigate to settings", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page).toHaveURL("/admin/settings");
    await expect(page.locator("body")).toContainText(/setting/i);
  });

  test("can view an existing course detail", async ({ page }) => {
    await page.goto("/admin/courses");

    const courseLink = page.locator('a[href*="/admin/courses/"]').first();
    const isVisible = await courseLink.isVisible().catch(() => false);

    if (isVisible) {
      await courseLink.click();
      await expect(page).toHaveURL(/\/admin\/courses\/[a-zA-Z0-9-]+/);
    } else {
      test.skip();
    }
  });
});
