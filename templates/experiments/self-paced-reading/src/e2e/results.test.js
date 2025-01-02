const { test, expect } = require("@playwright/test");
const { expInfo } = require("./expInfo");

test.describe("Results page in simulation mode", () => {
  // Skip this block if data collection is paused
  test.skip(() => expInfo.paused, "Experiment is paused");
  // Skip this block if no simulation mode available
  test.skip(() => !expInfo.simulationMode, "Simulation mode not available");
  // Skip this block if the experiment isn't set to show results
  test.skip(() => !expInfo.showResults, "Experiment does not show results");
  // Skip this block if the experiment is set to model-prediction results
  test.skip(
    () => expInfo.resultsType === "modelPrediction",
    "This test is currently only for percentile rank feedback",
  );

  test.beforeEach(async ({ page }) => {
    // Go to the experiment in simulation mode
    await page.goto(`/quizzes/${expInfo.shortName}?simulate=true`);

    // Wait for the experiment to finish
    await page.waitForSelector("text=Click to see your results!");
  });

  test("should display the correct results", async ({ page }) => {
    // Click the link to see results
    await page.click("text=Click to see your results!");

    // Wait for the results to load
    await page.waitForSelector("h1");

    // Check that the results header is correct
    const resultsHeader = await page.locator("h1");
    await expect(resultsHeader).toHaveText(`Your results for ${expInfo.longName}`);

    // Check the results text
    const resultsText = await page.locator("p");
    const resultsTextContent = await resultsText.textContent();
    const regex = /You were faster than (\d+\.\d+)% of (\d+) other people/;
    const match = resultsTextContent.match(regex);

    if (match) {
      const percentageRank = parseFloat(match[1]);

      // Calculate the number of fully and partially shaded icons
      const iconCount = 10;
      const shadedIcons = Math.floor((percentageRank * iconCount) / 100);
      const partialShade = (percentageRank % iconCount) / iconCount;

      // Wait for animation to complete
      await page.waitForTimeout(5000);

      // Check the number of fully shaded icons
      const fullyShadedIcons = await page.locator(
        "svg stop[stop-color='blue'] animate[from='0'][to='1']",
      );
      await expect(fullyShadedIcons).toHaveCount(shadedIcons);

      // Check the partial shading
      if (partialShade > 0) {
        const partiallyShadedIcon = await page.locator(
          `svg stop[stop-color='blue'] animate[from='0'][to='${partialShade}']`,
        );
        await expect(partiallyShadedIcon).toHaveCount(1);
      }
    } else {
      throw new Error("Results text did not match expected format.");
    }
  });
});
