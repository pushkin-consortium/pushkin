const { test, expect } = require("@playwright/test");
const { pushkinConfig } = require("./siteInfo");

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });
  test("should have the right title", async ({ page }) => {
    const title = await page.title();
    expect(title).toBe("Massive Online Experiments");
  });
});

test.describe("Navbar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });
  test("should display whoAmI from the config file", async ({ page }) => {
    const navTitle = await page.locator("nav > a");
    await expect(navTitle).toHaveText(pushkinConfig.info.whoAmI);
  });
  test("should display correct site pages", async ({ page }) => {
    const pages = ["Quizzes", "Findings", "About"];
    await expect(page.locator(".navbar-nav > a")).toHaveText(pages);
  });
});
