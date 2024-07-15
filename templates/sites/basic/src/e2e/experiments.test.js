const { test, expect } = require("@playwright/test");
const { expInfo } = require("./siteInfo");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Homepage experiment list", () => {
  test("should display all experiments", async ({ page }) => {
    const expCards = await page.locator(".card-body > div");
    const activeExps = expInfo.filter((exp) => !exp.archived);
    const expNames = activeExps.map((exp) => exp.longName);
    await expect(expCards).toHaveText(expNames);
  });
});

expInfo
  .filter((exp) => !exp.archived)
  .forEach((exp) => {
    test.describe(exp.longName, () => {
      test("should open when image is clicked", async ({ page }) => {
        const expCard = await page.locator(".card-body").filter({ hasText: exp.longName });
        const expImg = await expCard.getByRole("img");
        await expImg.click();
        await page.waitForURL(`http://localhost/quizzes/${exp.shortName}`);
        const jsPsychTarget = await page.locator("#jsPsychTarget");
        await expect(jsPsychTarget).toHaveText(/.+/);
      });
      test("should open when button is clicked", async ({ page }) => {
        const expCard = await page.locator(".card").filter({ hasText: exp.longName });
        const expButton = await expCard.locator(".btn");
        await expButton.click();
        await page.waitForURL(`http://localhost/quizzes/${exp.shortName}`);
        const jsPsychTarget = await page.locator("#jsPsychTarget");
        await expect(jsPsychTarget).toHaveText(/.+/);
      });
    });
  });

module.exports = { expInfo };
