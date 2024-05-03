import experiments from "./experiments"; 
// Note this will map to mock version in dev environment

// This is mostly for running tests in a user's site after installation
describe('experiments list', () => {
  test('exports an array with at least one experiment', () => {
    expect(experiments).toBeInstanceOf(Array);
    expect(experiments.length).toBeGreaterThan(0);
  });
  test('each experiment object has the correct properties', () => {
    experiments.forEach((exp) => {
        expect(exp).toBeInstanceOf(Object);
        expect(exp).toHaveProperty('fullName');
        expect(exp).toHaveProperty('shortName');
        expect(exp).toHaveProperty('module');
        expect(exp).toHaveProperty('logo');
        expect(exp).toHaveProperty('tagline');
        expect(exp).toHaveProperty('duration');
        expect(exp).toHaveProperty('text');
        });
    });
});
