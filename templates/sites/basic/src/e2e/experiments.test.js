const { test, expect } = require("@playwright/test");
const { expsInfo } = require("./siteInfo");

/**
 * @typedef {import('playwright').Page} Page
 */

/**
 * Click on the corresponding image to open the experiment
 * @param {Page} page Playwright page object
 * @param {object} exp Experiment object from siteInfo.js
 * @param {string} exp.longName Full name of the experiment from config.yaml
 * @param {string} exp.shortName Short name of the experiment from config.yaml
 * @param {boolean} exp.archived Whether the experiment is archived
 * @param {boolean} exp.paused Whether data collection for the experiment is paused
 */
const clickExpImg = async (page, exp) => {
  const expCard = await page.locator(".card-body").filter({ hasText: exp.longName });
  const expImg = await expCard.getByRole("img");
  await expImg.click();
  await page.waitForURL(`/quizzes/${exp.shortName}`);
};

/**
 * Click on the corresponding button to open the experiment
 * @param {Page} page Playwright page object
 * @param {object} exp Experiment object from siteInfo.js
 * @param {string} exp.longName Full name of the experiment from config.yaml
 * @param {string} exp.shortName Short name of the experiment from config.yaml
 * @param {boolean} exp.archived Whether the experiment is archived
 * @param {boolean} exp.paused Whether data collection for the experiment is paused
 */
const clickExpButton = async (page, exp) => {
  const expCard = await page.locator(".card").filter({ hasText: exp.longName });
  const expButton = await expCard.locator(".btn");
  await expButton.click();
  await page.waitForURL(`/quizzes/${exp.shortName}`);
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Homepage experiment list", () => {
  test("should display all experiments", async ({ page }) => {
    const expCards = await page.locator(".card-body > div");
    // Archived experiments should not be displayed
    const activeExps = expsInfo.filter((exp) => !exp.archived);
    const expNames = activeExps.map((exp) => exp.longName);
    await expect(expCards).toHaveText(expNames);
  });
});

expsInfo
  .filter((exp) => !exp.archived)
  .forEach((exp) => {
    test.describe(exp.longName, () => {
      test("should open when image is clicked", async ({ page }) => {
        clickExpImg(page, exp);
        // jsPsychTarget should have some text when the experiment loads
        const jsPsychTarget = await page.locator("#jsPsychTarget");
        await expect(jsPsychTarget).toHaveText(/.+/);
      });
      test("should open when button is clicked", async ({ page }) => {
        clickExpButton(page, exp);
        const jsPsychTarget = await page.locator("#jsPsychTarget");
        await expect(jsPsychTarget).toHaveText(/.+/);
      });
    });
  });
