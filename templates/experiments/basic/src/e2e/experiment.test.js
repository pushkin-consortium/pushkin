const { test, expect } = require("@playwright/test");
const knex = require("knex");
const { expInfo } = require("./expInfo");
const { pushkinConfig } = require("../../../e2e/siteInfo");

/**
 * Get a random alphanumeric key
 * @returns {string} A random alphanumeric key
 */
function getRandomKey() {
  const keys = "abcdefghijklmnopqrstuvwxyz1234567890";
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}

/**
 * Get connect to the Pushkin database
 * @returns {knex} A connection to the Pushkin database
 */
function connectToDB() {
  return knex({
    client: "pg",
    connection: {
      host: pushkinConfig.databases.localtestdb.url,
      database: pushkinConfig.databases.localtestdb.name,
      port: pushkinConfig.databases.localtestdb.port,
      user: pushkinConfig.databases.localtestdb.user,
      password: pushkinConfig.databases.localtestdb.pass,
    },
  });
}

// Skip all tests if the experiment is archived
test.skip(() => expInfo.archived, "Experiment is archived");

test.describe("Opening the experiment", () => {
  // Skip this describe block if data collection is paused
  test.skip(() => expInfo.paused, "Experiment is paused");
  // These vars need to be accessible to before/after hooks and tests
  let startRequestData;
  let db;
  let dbUsers;
  test.beforeEach(async ({ page }) => {
    // Set up listeners for the startExperiment request and response
    const startRequestPromise = page.waitForRequest(`/api/${expInfo.shortName}/startExperiment`);
    const startResponsePromise = page.waitForResponse(`/api/${expInfo.shortName}/startExperiment`);
    // Go to the experiment
    await page.goto(`/quizzes/${expInfo.shortName}`);
    // Wait for experiment to load
    await page.locator("#jsPsychTarget", { hasText: /.+/ }).waitFor();
    // Wait for the API request
    const startRequest = await startRequestPromise;
    startRequestData = startRequest.postDataJSON();
    // Connect to database and query the users table
    db = connectToDB();
    // Wait for the API response before querying the database
    await startResponsePromise;
    dbUsers = await db.select().from("pushkin_users");
  });
  test.afterEach(async () => {
    return db.destroy();
  });
  test("should trigger the startExperiment request", async () => {
    expect(startRequestData).toEqual(expect.objectContaining({ user_id: expect.any(String) }));
  });
  test("should add the user to the users table", async () => {
    const userIDs = dbUsers.map((user) => user.user_id);
    expect(userIDs).toEqual(expect.arrayContaining([startRequestData.user_id]));
  });
});

test.describe("First trial data", () => {
  // Skip this describe block if data collection is paused
  test.skip(() => expInfo.paused, "Experiment is paused");
  // These vars need to be accessible to before/after hooks and tests
  let randomKey;
  let trialTimeWeb;
  let trialData;
  let db;
  let dbData;
  test.beforeEach(async ({ page }) => {
    await page.goto(`/quizzes/${expInfo.shortName}`);
    // Wait for experiment to load
    await page.locator("#jsPsychTarget", { hasText: /.+/ }).waitFor();
    // Set up listeners for the stimulusResponse request and response
    const trialRequestPromise = page.waitForRequest(`/api/${expInfo.shortName}/stimulusResponse`);
    const trialResponsePromise = page.waitForResponse(`/api/${expInfo.shortName}/stimulusResponse`);
    // Press a random key to complete the first trial
    randomKey = getRandomKey();
    await page.keyboard.press(randomKey);
    // Save this to compare to database time
    trialTimeWeb = Date.now();
    const trialRequest = await trialRequestPromise;
    trialData = trialRequest.postDataJSON();
    // Connect to database and get the latest response from the user
    db = connectToDB();
    // Wait for the API response before querying the database
    await trialResponsePromise;
    dbData = await db
      .select()
      .from(`${expInfo.shortName}_stimulusResponses`)
      .where("user_id", trialData.user_id)
      // Get latest response, although there should only be one
      .orderBy("created_at", "desc")
      .first();
  });
  test.afterEach(async () => {
    return db.destroy();
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
  test("should have the 'Hello, world!' stimulus", async () => {
    expect(JSON.parse(dbData.stimulus)).toBe("Hello, world!");
    expect(dbData.response.stimulus).toBe("Hello, world!");
  });
  test("should have the correct key response", async () => {
    expect(dbData.response.response).toBe(randomKey);
  });
  test("should approximately match the time of the keypress on the site", async () => {
    const trialTimeDB = new Date(dbData.created_at).getTime();
    expect(Math.abs(trialTimeDB - trialTimeWeb)).toBeLessThan(5000); // within 5 seconds of each other
  });
  test("should match the data sent with the stimulusResponse request", async () => {
    expect(trialData.stimulus).toEqual(JSON.parse(dbData.stimulus));
    expect(trialData.data_string).toEqual(dbData.response);
  });
});

test.describe("Completing the experiment in simulation mode", () => {
  // Skip this describe block if data collection is paused
  test.skip(() => expInfo.paused, "Experiment is paused");
  // Skip this describe block if no simulation mode available
  test.skip(() => !expInfo.simulationMode, "Simulation mode not available");
  // These vars need to be accessible to before/after hooks and tests
  let stimulusResponseRequests = [];
  let userResults;
  let db;
  let dbUserResults;
  let dbStimulusResponses;
  test.beforeEach(async ({ page }) => {
    // Clear the stimulusResponseRequests array
    // In some contexts (especially CI) this array seems to get polluted with data from other tests
    stimulusResponseRequests = [];
    // Set up listeners for the tabulateAndPostResults request and response
    const tabulateRequestPromise = page.waitForRequest(
      `/api/${expInfo.shortName}/tabulateAndPostResults`,
    );
    const tabulateResponsePromise = page.waitForResponse(
      `/api/${expInfo.shortName}/tabulateAndPostResults`,
    );
    // Log stimulusResponse requests
    page.on("request", (request) => {
      if (request.url().includes(`/api/${expInfo.shortName}/stimulusResponse`)) {
        // Capture the request data
        const requestData = request.postDataJSON();
        // Create a promise for the response
        const responsePromise = request.response();
        stimulusResponseRequests.push({ requestData, responsePromise });
      }
    });
    // Go to the experiment in simulation mode
    await page.goto(`/quizzes/${expInfo.shortName}?simulate=true`);
    // Wait for the experiment to finish and the tabulateAndPostResults request to be made
    const tabulateRequest = await tabulateRequestPromise;
    userResults = tabulateRequest.postDataJSON();
    // Connect to database and query the userResults and stimulusResponses tables
    db = connectToDB();
    // Wait for API responses before querying the database
    const responsePromises = stimulusResponseRequests.map((request) => request.responsePromise);
    responsePromises.push(tabulateResponsePromise);
    await Promise.all(responsePromises);
    // Database queries
    dbUserResults = await db
      .select()
      .from("pushkin_userResults")
      .where("user_id", userResults.user_id)
      // Get only the latest row, although there should only be one
      .orderBy("created_at", "desc")
      .first();
    dbStimulusResponses = await db
      .select()
      .from(`${expInfo.shortName}_stimulusResponses`)
      .where("user_id", userResults.user_id);
    // Sort experiment data by trial_index
    // When running in simulation mode, trial data may not write to the database in order
    dbStimulusResponses.sort((a, b) => a.response.trial_index - b.response.trial_index);
  });
  test.afterEach(async () => {
    return db.destroy();
  });
  test("should trigger the expected number of stimulusResponse requests", async () => {
    expect(stimulusResponseRequests).toHaveLength(expInfo.dataRows);
  });
  test("should trigger the expected tabulateAndPostResults request", async () => {
    expect(userResults).toEqual({ user_id: expect.any(String), experiment: expInfo.longName });
  });
  test("should produce data with the correct length", async () => {
    expect(dbStimulusResponses).toHaveLength(expInfo.dataRows);
  });
  test("should produce data matching the stimulusResponse requests", async () => {
    stimulusResponseRequests.forEach((request, index) => {
      const dbData = dbStimulusResponses[index];
      expect(request.requestData).toEqual(
        expect.objectContaining({
          user_id: dbData.user_id,
          data_string: dbData.response,
          stimulus: JSON.parse(dbData.stimulus),
        }),
      );
    });
  });
  test("should produce data with the correct user ID", async () => {
    // There will only ever be one userID in dbStimulusResponses (see query above)
    // User ID in the stimulusResponses table should match tabulateAndPostResults request
    expect(dbStimulusResponses[0].user_id).toBe(userResults.user_id);
    // User ID in the userResults table should match tabulateAndPostResults request
    expect(dbUserResults.user_id).toBe(userResults.user_id);
  });
});
