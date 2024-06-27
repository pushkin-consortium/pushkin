const fs = require("fs");
const knex = require("knex");
const jsYaml = require("js-yaml");
const puppeteer = require("puppeteer");
const url = "http://localhost:80/";
let browser;
let page;
let expNames;
let db;
const connection = {};

// If the pushkin.yaml file exists, we are in the user's site after template installation
if (fs.existsSync("pushkin.yaml")) {
  // Read from the site's experiments directory
  expNames = fs.readdirSync("experiments");
  // Get the database connection info from pushkin.yaml
  const pushkinConfig = jsYaml.safeLoad(fs.readFileSync("pushkin.yaml", "utf8"));
  connection.host = pushkinConfig.databases.localtestdb.url;
  connection.database = pushkinConfig.databases.localtestdb.name;
  connection.port = pushkinConfig.databases.localtestdb.port;
  connection.user = pushkinConfig.databases.localtestdb.user;
  connection.password = pushkinConfig.databases.localtestdb.password;
} else {
  // Read from the repo's experiment templates directory and add "_path"
  expNames = fs.readdirSync("templates/experiments").map((template) => `${template}_path`);
  // Fill in the default database connection info
  connection.host = "localhost";
  connection.database = "test_db";
  connection.port = "5432";
  connection.user = "postgres";
  connection.password = "example";
}

beforeAll(() => {
  // Open the database connection
  db = knex({
    client: "pg",
    connection: connection,
  });
});

afterAll(() => {
  // Close the database connection
  return db.destroy();
});

beforeEach(async () => {
  browser = await puppeteer.launch();
  page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url);
});

afterEach(async () => {
  await browser.close();
});

describe("Homepage experiment list", () => {
  test("should display all experiments", async () => {
    const expNamesWeb = await page.$$eval(".card-body > div", (exps) =>
      exps.map((exp) => exp.textContent),
    );
    expect(expNamesWeb).toEqual(expNames);
  });
});

describe.each(expNames)("Experiment: %s", (expName) => {
  test("should open when clicked", async () => {
    const expCards = await page.$$(".card-body");
    const expCard = expCards.filter(async (card) => {
      const cardText = await card.evaluate((el) => el.textContent);
      return cardText === expName;
    })[0];
    const expImg = await expCard.$("img");
    await expImg.click();
    const jsPsychTarget = await page.waitForSelector("#jsPsychTarget");
    // Tests fail without the line below in headless mode without slowMo
    // Perhaps the jsPsychTarget div exists, but the text hasn't loaded yet?
    await page.waitForNetworkIdle();
    const jsPsychText = await jsPsychTarget.evaluate((el) => el.textContent);
    expect(jsPsychText.length).toBeGreaterThan(0);
  });
});

describe("Basic experiment", () => {
  test("should log data correctly", async () => {
    const expCards = await page.$$(".card-body");
    const expCard = expCards.filter(async (card) => {
      const cardText = await card.evaluate((el) => el.textContent);
      return cardText.includes("basic");
    })[0];
    const expImg = await expCard.$("img");
    await expImg.click();
    await page.waitForSelector("#jsPsychTarget");
    await page.waitForNetworkIdle();
    await page.keyboard.press("f");
    // Get the timestamp for the trial
    const trialTimeWeb = Date.now() / 1000; // convert to seconds
    // Check that the data was logged in the database
    const data = await db // Fetch only the most recent row
      .select()
      .from("basic_path_stimulusResponses")
      .orderBy("created_at", "desc")
      .first();
    const trialTimeDB = new Date(data.created_at).getTime() / 1000; // convert to seconds
    expect(data).not.toBeNull();
    expect(data.response).toEqual(
      expect.objectContaining({
        rt: expect.any(Number),
        stimulus: expect.any(String),
        response: expect.any(String),
      }),
    );
    expect(data.response.stimulus).toBe("Hello, world!");
    expect(data.response.response).toBe("f");
    expect(trialTimeDB).toBeCloseTo(trialTimeWeb, 1); // within 50 milliseconds
  });
});
