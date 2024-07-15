const { test, expect } = require("@playwright/test");
const knex = require("knex");
const { pushkinConfig, expInfo } = require("./siteInfo");

expInfo
  .filter((exp) => !exp.paused && !exp.archived)
  .forEach((exp) => {
    let page;
    let trialTimeWeb;
    let trialData;
    let db;
    let dbData;
    test.describe(`First trial data for ${exp.longName}`, () => {
      test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto("/");
        const expCard = await page.locator(".card-body").filter({ hasText: exp.longName });
        const expImg = await expCard.getByRole("img");
        await expImg.click();
        await page.waitForURL(`http://localhost/quizzes/${exp.shortName}`);
        await page.locator("#jsPsychTarget", { hasText: /.+/ }).waitFor();
        const trialRequestPromise = page.waitForRequest(`/api/${exp.shortName}/stimulusResponse`);
        await page.keyboard.press(" ");
        trialTimeWeb = Date.now();
        const trialRequest = await trialRequestPromise;
        trialData = trialRequest.postDataJSON();
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
      test.afterAll(async () => {
        await page.close();
        await db.destroy();
      });
      test("should have the correct format", async () => {
        if (!trialData || !dbData || !db) console.log([trialData, dbData, db]);
        expect(dbData).not.toBeNull();
        expect(dbData.response).toEqual(
          expect.objectContaining({
            rt: expect.any(Number),
            stimulus: expect.any(String),
            response: expect.any(String),
          }),
        );
        expect(dbData.response.stimulus).toEqual(expect.any(String));
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
