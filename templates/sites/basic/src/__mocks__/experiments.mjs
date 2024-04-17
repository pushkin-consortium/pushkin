import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module using import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const experimentsDir = path.resolve(__dirname, '../../../../experiments/');
const experimentDirectories = fs.readdirSync(experimentsDir).filter(dir => !dir.startsWith('.'));

const mockExperiments = experimentDirectories.map(dir => ({
  fullName: dir,
  shortName: dir, 
  module: path.join(experimentsDir, dir, 'src', 'web page'), // Assuming module is located as specified
  logo: 'logo512.png',
  tagline: 'Be a citizen scientist! Try this quiz.',
  duration: ''
}));

export default mockExperiments;

/* 
What this should look like (currently)
[
  {
    fullName: 'basic',
    shortName: 'basic',
    module: '/Users/hunterschep/pushkin/pushkin/templates/experiments/basic/src/web page',
    logo: 'logo512.png',
    tagline: 'Be a citizen scientist! Try this quiz.',
    duration: ''
  },
  {
    fullName: 'grammaticality-judgment',
    shortName: 'grammaticality-judgment',
    module: '/Users/hunterschep/pushkin/pushkin/templates/experiments/grammaticality-judgment/src/web page',
    logo: 'logo512.png',
    tagline: 'Be a citizen scientist! Try this quiz.',
    duration: ''
  },
  {
    fullName: 'lexical-decision',
    shortName: 'lexical-decision',
    module: '/Users/hunterschep/pushkin/pushkin/templates/experiments/lexical-decision/src/web page',
    logo: 'logo512.png',
    tagline: 'Be a citizen scientist! Try this quiz.',
    duration: ''
  },
  {
    fullName: 'self-paced-reading',
    shortName: 'self-paced-reading',
    module: '/Users/hunterschep/pushkin/pushkin/templates/experiments/self-paced-reading/src/web page',
    logo: 'logo512.png',
    tagline: 'Be a citizen scientist! Try this quiz.',
    duration: ''
  }
]
*/ 