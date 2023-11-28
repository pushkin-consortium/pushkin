/**
 * @jest-environment jsdom
 */

import { initJsPsych } from 'jspsych';
import { startTimeline, simulateTimeline } from "@jspsych/test-utils";

import { createTimeline } from "./experiment";

jest.useFakeTimers();

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
    it("returns a valid jsPsych timeline", async () => {
        const timeline = createTimeline(jsPsych);
        // Check that the timeline is an array
        expect(Array.isArray(timeline)).toBeTruthy();
        // Check that the timeline contains at least one trial
        expect(timeline.length).toBeGreaterThan(0);
        // Check that the timeline will at least start running
        const { expectRunning } = await startTimeline(timeline);
        await expectRunning();
    });

    // This test will probably fail if the user customizes the template
    it("returns a timeline that runs to completion in simulation mode", async () => {
        // Check that the timeline runs and finishes with expected data
        const timeline = createTimeline(jsPsych);
        const { expectFinished } = await simulateTimeline(timeline);
        await expectFinished();
    });

});