const timeline = require('./experiment.js');

describe('Experiment Timeline', () => {
  it('should be an array', () => {
    expect(Array.isArray(timeline)).toBe(true);
  });

  it('should contain at least one trial', () => {
    expect(timeline.length).toBeGreaterThan(0);
  });

  it('should have the correct structure for the hello world trial', () => {
    const helloWorldTrial = timeline[0]; // Assuming the hello world trial is the first one
    expect(helloWorldTrial).toHaveProperty('type', 'html-keyboard-response');
    expect(helloWorldTrial).toHaveProperty('stimulus', 'Hello world!');
  });
});


// The exported timeline is indeed an array.
// The timeline contains at least one trial.
// The first trial in the timeline is a "Hello world!" trial of the type 'html-keyboard-response'.