const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const buildExpWebComponents = () => {
    // Make a list of all experiment templates
    let expTemplates = fs.readdirSync(path.join(__dirname, '../../experiments'))
    expTemplates = expTemplates.filter(dir => dir !== '.DS_Store');

    // Create an array of objects to mock a typical experiments.js file
    const expsJsArray = expTemplates.map(exp => {
        const expObject = [
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
    const expsJsMock = `export default [\n\t${expsJsArray.join(',\n\t')}\n];`;

    // Write it to the __mocks__ folder
    try {
        fs.writeFileSync(path.join(__dirname, 'src/__mocks__/experiments.js'), expsJsMock);
    } catch (err) {
        console.error('Could not write mock experiments.js', err);
    }

    // Build all experiment template web page components
    expTemplates.forEach(exp => {
        try {
            console.log(`Building web page component for @pushkin-templates/exp-${exp}`);
            execSync(
                "yarn install --frozen-lockfile && yarn build",
                {cwd: path.join(__dirname, `../../experiments/${exp}/src/web page`)}
            );
        } catch (err) {
            console.error(`Could not build web page component for ${exp}:`, err);
        }
    });
}

module.exports = buildExpWebComponents;
    