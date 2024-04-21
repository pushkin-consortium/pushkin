const fs = require('fs');
const execSync = require('child_process').execSync;

// Make a list of all experiment templates
const expTemplates = fs.readdirSync('../../experiments').filter(dir => dir !== '.DS_Store');

// Create an array of objects to mock a typical experiments.js file
const expsJsArray = expTemplates.map(exp => {
    expObject = [
        `fullName: "${exp}"`,
        `shortName: "${exp}"`,
        `module: require('../../../../experiments/${exp}/src/web page').default`,
        `logo: "logo512.png"`,
        `tagline: "Be a citizen scientist! Try this quiz."`,
        `duration: ""`,
        `text: "Enter your experiment description here."`
    ];
    return `{\n\t\t${expObject.join(',\n\t\t')},\n\t}`;
});
const expsJsMock = `module.exports = [\n\t${expsJsArray.join(',\n\t')}\n];`;

// Write it to the __mocks__ folder
try {
    fs.writeFileSync('./src/__mocks__/experiments.js', expsJsMock);
} catch (err) {
    console.error('Could not write mock experiments.js', err);
}

// Build all experiment template web page components
expTemplates.forEach(exp => {
    try {
        console.log(`Building web page component for @pushkin-templates/exp-${exp}`);
        execSync("yarn install --frozen-lockfile && yarn build", {cwd: `../../experiments/${exp}/src/web page`});
    } catch (err) {
        console.error(`Could not build web page component for ${exp}:`, err);
    }
});
    