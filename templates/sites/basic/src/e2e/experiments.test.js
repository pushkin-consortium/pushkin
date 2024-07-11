const { test, expect } = require("@playwright/test");
const fs = require("fs");
const jsYaml = require("js-yaml");
const knex = require("knex");

// Get the experiment names and other relevant info from exp config files
const expInfo = [];
const expFolders = fs.readdirSync("./experiments");
expFolders.forEach((exp) => {
  const expConfig = jsYaml.load(fs.readFileSync(`./experiments/${exp}/config.yaml`));
  expInfo.push({
    longName: expConfig.experimentName,
    shortName: expConfig.shortName,
    archived: expConfig.archived,
    paused: expConfig.dataPaused,
  });
});

// Get the main config file
const pushkinConfig = jsYaml.load(fs.readFileSync("pushkin.yaml", "utf8"));

// Used for database connections
let db;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Homepage experiment list", () => {
  test("should display all experiments", async ({ page }) => {
    const expCards = await page.locator(".card-body > div");
    const expNames = expInfo.map((exp) => exp.longName);
    await expect(expCards).toHaveText(expNames);
  });
});

expInfo.forEach((exp) => {
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
  test.describe(`Data logging for ${exp.longName}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/quizzes/${exp.shortName}`);
      await page.locator("#jsPsychTarget", { hasText: /.+/ }).waitFor();
      // Connect to the database
      db = knex({
        client: "pg",
        connection: {
          host: pushkinConfig.databases.localtestdb.url,
          database: pushkinConfig.databases.localtestdb.name,
          port: pushkinConfig.databases.localtestdb.port,
          user: pushkinConfig.databases.localtestdb.user,
          password: pushkinConfig.databases.localtestdb.pass,
        },
      });
    });
    test.afterEach(async () => {
      // Disconnect from the database
      return db.destroy();
    });
    test("should look correct for the first trial", async ({ page }) => {
      await page.keyboard.press(" ");
      // Get the timestamp for the trial
      const trialTimeWeb = Date.now();
      // Check that the data was logged in the database
      const data = await db // Fetch only the most recent row
        .select()
        .from(`${exp.shortName}_stimulusResponses`)
        .orderBy("created_at", "desc")
        .first();
      const trialTimeDB = new Date(data.created_at).getTime();
      expect(data).not.toBeNull();
      expect(data.response).toEqual(
        expect.objectContaining({
          rt: expect.any(Number),
          stimulus: expect.any(String),
          response: expect.any(String),
        }),
      );
      expect(data.response.stimulus).toEqual(expect.any(String));
      expect(data.response.response).toBe(" ");
      expect(Math.abs(trialTimeDB - trialTimeWeb)).toBeLessThan(5000); // within 5 seconds of each other
    });
    test("should match the data sent with the stimulusResponse request", async ({ page }) => {
      const trialRequestPromise = page.waitForRequest(
        `http://localhost/api/${exp.shortName}/stimulusResponse`,
      );
      await page.keyboard.press(" ");
      const trialRequest = await trialRequestPromise;
      const trialData = trialRequest.postDataJSON();
      const dbData = await db // Fetch only the most recent row
        .select()
        .from(`${exp.shortName}_stimulusResponses`)
        .where("user_id", trialData.user_id)
        .orderBy("created_at", "desc")
        .first();
      expect(trialData.stimulus).toEqual(JSON.parse(dbData.stimulus));
      expect(trialData.data_string).toEqual(dbData.response);
    });
  });
});
