/**
 * @jest-environment jsdom
 */

import { createTimeline } from "./experiment";
import { pressKey, startTimeline } from "@jspsych/test-utils";

jest.useFakeTimers();

describe("createTimeline", () => {
    // This test should pass regardless of any user customizations of the template
    it("returns a valid jsPsych timeline", async () => {
        const timeline = createTimeline();
        // Check that the timeline is an array
        expect(Array.isArray(timeline)).toBeTruthy();
        // Check that the timeline contains at least one trial
        expect(timeline.length).toBeGreaterThan(0);
        // Check that the timeline will at least start running
        const { expectRunning } = await startTimeline(timeline);
        await expectRunning();
    });

    // This test will probably fail if the user customizes the template
    it("returns a timeline with a single 'Hello, world!' trial", async () => {
        // Check that the timeline runs and finishes with expected data
        const timeline = createTimeline();
        const { expectFinished, getData } = await startTimeline(timeline);
        jest.advanceTimersByTime(1000);
        pressKey("a");
        await expectFinished();
        expect(getData().values()[0].rt).toBe(1000);
        expect(getData().values()[0].response).toBe("a");
    });
});