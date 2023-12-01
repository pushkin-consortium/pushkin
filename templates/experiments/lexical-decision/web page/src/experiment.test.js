/**
 * @jest-environment jsdom
 */

import { initJsPsych } from 'jspsych';
import { startTimeline, simulateTimeline } from "@jspsych/test-utils";

import { createTimeline } from "./experiment";
import stimArray from "./stim";

describe("createTimeline", () => {
    let jsPsych;

    beforeEach(() => {
        // Create a div to hold the experiment in case experiment.js refers to it
        document.body.innerHTML = '<div id="jsPsychTarget"></div>';
        // Initialize jsPsych, since createTimeline takes jsPsych as an argument
        jsPsych = initJsPsych({
            display_element: document.getElementById('jsPsychTarget'),
        });
    });

    // This test should pass regardless of any user customizations of the template
    test("returns a valid jsPsych timeline", async () => {
        const timeline = createTimeline(jsPsych);
        // Check that the timeline is an array
        expect(Array.isArray(timeline)).toBeTruthy();
        // Check that the timeline contains at least one trial
        expect(timeline.length).toBeGreaterThan(0);
        // Check that the timeline will at least start running
        const { expectRunning } = await startTimeline(timeline);
        await expectRunning();
    });

    // This test should probably still pass if the user customizes the template,
    // unless they use a plugin which doesn't support simulation mode
    test("returns a timeline that runs to completion in simulation mode", async () => {
        // Check that the timeline finishes running
        const timeline = createTimeline(jsPsych);
        const { expectFinished } = await simulateTimeline(timeline, 'data-only', {}, jsPsych);
        await expectFinished();
    });
    
    // These tests may fail if the user customizes the template
    describe("Experiment config options", () => {
        const feedbackOptions = [true, false];
        // Testing feedback options for successful completion and data collection
        for (const feedback of feedbackOptions) {
            test(`produce expected data when feedback=${feedback}`, async () => {
                // Reset the module registry
                // This is necessary because the original config.js will be cached
                jest.resetModules();
                // Mock config.js with the various feedback/response options
                // doMock seems to be necessary (vs. mock) for scope reasons
                jest.doMock('./config', () => {
                    const originalConfig = jest.requireActual('./config');
                    return {
                        ...originalConfig,
                        correctiveFeedback: feedback, // mocked correctiveFeedback
                    };
                });
                // Now re-import createTimeline so it gets the mocked config.js object
                const { createTimeline } = require('./experiment');

                // Check that the timeline runs and finishes with expected data
                const timeline = createTimeline(jsPsych);
                const { getData, expectFinished } = await simulateTimeline(timeline, 'data-only', {}, jsPsych);
                await expectFinished();
                // Have to filter on correct=true OR correct=false to get all the experimental trials 
                expect(getData().filter([{ correct: true}, { correct: false}]).count()).toBe(stimArray.length);
            });
        }
    });
});