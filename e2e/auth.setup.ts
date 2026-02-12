import { test as setup, expect } from "@playwright/test";

const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL ?? "admin@vetsintech.demo";
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD ?? "VITadmin2026!";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@vetsintech.demo";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "VITadmin2026!";

setup("authenticate as student", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', STUDENT_EMAIL);
  await page.fill('input[name="password"]', STUDENT_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 15_000 });

  // Save auth state
  await page.context().storageState({ path: "e2e/.auth/student.json" });
});

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 15_000 });

  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
