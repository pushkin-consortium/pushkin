import { execSync } from 'child_process'; // eslint-disable-line
let pMan
let stdout

try {
	stdout = execSync("yarn --version")
	pMan = "yarn";
} catch (e) {
	try {
		stdout = execSync("npm --version")
		pMan = "npm"
	} catch (e) {
		console.log("Error: You must have npm or yarn installed!")
	}
}

export default pMan;