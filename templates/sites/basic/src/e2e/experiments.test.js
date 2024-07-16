const { test, expect } = require("@playwright/test");
const { expInfo } = require("./siteInfo");

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
        clickExpImg(page, exp);
        const jsPsychTarget = await page.locator("#jsPsychTarget");
        await expect(jsPsychTarget).toHaveText(/.+/);
      });
      test("should open when button is clicked", async ({ page }) => {
        clickExpButton(page, exp);
        const jsPsychTarget = await page.locator("#jsPsychTarget");
        await expect(jsPsychTarget).toHaveText(/.+/);
      });
      test("should hit startExperiment API endpoint when opened", async ({ page }) => {
        const startExpRequestPromise = page.waitForRequest(`/api/${exp.shortName}/startExperiment`);
        clickExpImg(page, exp);
        await page.locator("#jsPsychTarget", { hasText: /.+/ }).waitFor();
        const startExpRequest = await startExpRequestPromise;
        const startExpData = startExpRequest.postDataJSON();
        expect(startExpData.user_id).not.toBeNull();
        expect(startExpData.user_id).toEqual(expect.any(String));
      });
      test("should hit startExperiment API endpoint when trial is completed", async ({ page }) => {
        const trialRequestPromise = page.waitForRequest(`/api/${exp.shortName}/stimulusResponse`);
        clickExpImg(page, exp);
        await page.locator("#jsPsychTarget", { hasText: /.+/ }).waitFor();
        await page.keyboard.press(" ");
        const trialRequest = await trialRequestPromise;
        const trialData = trialRequest.postDataJSON();
        expect(trialData).not.toBeNull();
        expect(trialData.user_id).toEqual(expect.any(String));
        expect(trialData.data_string).toEqual(
          expect.objectContaining({
            rt: expect.any(Number),
            stimulus: expect.any(String),
            response: expect.any(String),
            trial_type: expect.any(String),
            trial_index: expect.any(Number),
            time_elapsed: expect.any(Number),
            internal_node_id: expect.any(String),
            user_id: expect.any(String),
          }),
        );
        expect(trialData.stimulus).toEqual(expect.any(String));
      });
    });
  });

module.exports = { expInfo };
