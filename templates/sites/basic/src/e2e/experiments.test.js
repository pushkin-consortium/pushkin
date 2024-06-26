const puppeteer = require("puppeteer");
const url = "http://localhost:80/";
let browser;
let page;
const expNames = [
  "basic_path",
  "grammaticality-judgment_path",
  //"lexical-decision_path",
  "self-paced-reading_path",
];

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
      return cardText.includes(`${expName}`);
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
  test("should log data", async () => {
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
    // Get the timestamp for the data row
    const timestamp = Date.now();
    console.log(timestamp);
    // Check that the data was logged in the database
    console.log(new Date("2024-06-26 15:00:10.335+00").getTime());
  });
});