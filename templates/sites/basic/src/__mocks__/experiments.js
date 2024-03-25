// mock structure of experiments.js 
const mockExperiments = [
  {
    fullName: 'vocab Experiment',
    shortName: 'vocab',
    module: function MockVocabComponent() { return <div>Mock Vocab Component</div>; }, 
    logo: 'logo512.png',
    tagline: 'Be a citizen scientist! Try this quiz.',
    duration: ''
  },
  {
    fullName: 'mind Experiment',
    shortName: 'mind',
    module: function MockMindComponent() { return <div>Mock Mind Component</div>; },
    logo: 'logo512.png',
    tagline: 'Be a citizen scientist! Try this quiz.',
    duration: ''
  },
  {
    fullName: 'which English',
    shortName: 'english',
    module: function MockEnglishComponent() { return <div>Mock English Component</div>; }, 
    logo: 'logo512.png',
    tagline: 'Be a citizen scientist! Try this quiz.',
    duration: ''
  },
];

export default mockExperiments;
