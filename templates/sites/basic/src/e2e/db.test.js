const { test, expect } = require("@playwright/test");
const knex = require("knex");
const { pushkinConfig, expInfo } = require("./siteInfo");

expInfo
  .filter((exp) => !exp.paused && !exp.archived)
  // Paused and archived experiments won't send any data to the database
  .forEach((exp) => {
    test.describe(`First trial data for ${exp.longName}`, () => {
      // These vars need to be accessible to beforeAll, afterAll, and test blocks
      let page;
      let trialTimeWeb;
      let trialData;
      let db;
      let dbData;
      test.beforeAll(async ({ browser }) => {
        // Need to use the newPage method here because we are reusing browser context across tests
        // This cuts down the number of database connections we need to make
        page = await browser.newPage();
        await page.goto("/");
        // Click on the image to advance to the experiment
        const expCard = await page.locator(".card-body").filter({ hasText: exp.longName });
        const expImg = await expCard.getByRole("img");
        await expImg.click();
        // Wait for the experiment to load
        await page.waitForURL(`/quizzes/${exp.shortName}`);
        await page.locator("#jsPsychTarget", { hasText: /.+/ }).waitFor();
        // Set up a listener for the stimulusResponse request
        const trialRequestPromise = page.waitForRequest(`/api/${exp.shortName}/stimulusResponse`);
        await page.keyboard.press(" ");
        // Save this to compare to database time
        trialTimeWeb = Date.now();
        const trialRequest = await trialRequestPromise;
        trialData = trialRequest.postDataJSON();
        // Connect to database and get the latest response from the user
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
        dbData = await db
          .select()
          .from(`${exp.shortName}_stimulusResponses`)
          .where("user_id", trialData.user_id)
          // Get latest response
          .orderBy("created_at", "desc")
          .first();
      });
      // Close the page and database connection after all tests are done for the experiment
      test.afterAll(async () => {
        await page.close();
        await db.destroy();
      });
      test("should have the correct format", async () => {
        expect(dbData).not.toBeNull();
        expect(dbData.id).toEqual(expect.any(Number));
        expect(dbData.created_at).toEqual(expect.any(Date));
        expect(dbData.updated_at).toBeNull();
        expect(dbData.response).toEqual(
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
        expect(dbData.stimulus).toEqual(expect.any(String));
      });
      test("should have the correct key response", async () => {
        expect(dbData.response.response).toBe(" ");
      });
      test("should approximately match the trial time on the site", async () => {
        const trialTimeDB = new Date(dbData.created_at).getTime();
        expect(Math.abs(trialTimeDB - trialTimeWeb)).toBeLessThan(5000); // within 5 seconds of each other
      });
      test("should match the data sent with the stimulusResponse request", async () => {
        expect(trialData.stimulus).toEqual(JSON.parse(dbData.stimulus));
        expect(trialData.data_string).toEqual(dbData.response);
      });
    });
  });
