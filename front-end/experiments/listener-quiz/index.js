/* eslint-disable max-len */

require('script-loader!../jsPsych/jspsych.js');
require('script-loader!../jsPsych/plugins/jspsych-audio-button-response.js');
require('script-loader!../jsPsych/plugins/jspsych-audio-keyboard-response.js');
require('script-loader!../jsPsych/plugins/jspsych-call-function.js');
require('script-loader!../jsPsych/plugins/jspsych-survey-likert.js');
require('script-loader!../jsPsych/plugins/jspsych-survey-multi-choice.js');
require('script-loader!../jsPsych/plugins/jspsych-instructions.js');
require('script-loader!../jsPsych/plugins/jspsych-html-keyboard-response.js');

import React from 'react';
import ReactResizeDetector from 'react-resize-detector';
import { browserHistory } from 'react-router';
import axiosListenerQuiz from './axiosListenerQuiz';
import baseUrl from '../../core/baseUrl';
import s from './listener-quiz.css';

const variable = 'mysrc.jpg';

const button_text = `
<button>
  <img src="${variable}"
</button>
`;
class listenerQuiz extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: true };
    this.hideLoading = this.hideLoading.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize.bind(this));
    // this is an important workaround to clear any generated jspsych stuff that stays in the dom once even if you switch pages (because it's a single page app you're not actually switching pages, and also,  because jspysch generates dom nodes out of the scope of react, there's no automatic garbage collection). if you don't do do the following, there's a chance the experiment could accidentally carry on in the background.
    browserHistory.listen(() => {
      jsPsych.endExperiment();
      window.location.reload();
    });
  }
  hideLoading(props) {
    this.setState({ loading: false });
  }
  //Fixed onResize (doesn't break the quiz anymore)
  onResize() {
    const margin =
      (document.documentElement.clientHeight -
        document.getElementById('header').scrollHeight -
        document.getElementById('footer').scrollHeight -
        15 -
        document.getElementById('jsPsychTarget').scrollHeight) /
      2;
    if (margin > 0) {
      document.getElementById('jsPsychTarget').style.marginTop = `${margin}px`;
    } else {
      document.getElementById('jsPsychTarget').style.marginTop = '0px';
    }
  }

  /* jspsych functions */
  getHeadphoneCheck() {
    let arr = [];
    let audio = {};
    let questions = {};
    let file;
    let stims_shuf = jsPsych.randomization.shuffle([
      'antiphase_HC_IOS.wav',
      'antiphase_HC_ISO.wav',
      'antiphase_HC_OIS.wav',
      'antiphase_HC_OSI.wav',
      'antiphase_HC_SIO.wav',
      'antiphase_HC_SOI.wav'
    ]);
    for (let i in stims_shuf) {
      file = stims_shuf[i];
      audio = {
        type: 'audio-keyboard-response',
        stimulus: `${baseUrl}/quizzes/listener-quiz/audio/${file}`,
        timing_response: 5000,
        prompt: '<p align="left">Please listen to the sequence of tones.</p>',
        trial_ends_after_audio: true
      };
      questions = {
        type: 'html-keyboard-response',
        choices: ['1', '2', '3'],
        stimulus: '',
        prompt: `
          <p align="left">
              Which of the tones was the QUIETEST/SOFTEST? For the first, press <b>1</b>. For the second, press <b>2</b>. For the third, press <b>3</b>.
          </p>
        `
      };
      arr.push(audio);
      arr.push(questions);
    }
    return arr;
  }

  getTrials(stims) {
    const danceScale = [
      '<p align="left">Definitely do not use the song to dance</p>',
      ' ',
      ' ',
      ' ',
      ' ',
      '<p align="left">Definitely use the song to dance</p>'
    ];

    const storyScale = [
      '<p align="left">Definitely do not use the song to tell a story</p>',
      ' ',
      ' ',
      ' ',
      ' ',
      '<p align="left">Definitely use the song to tell a story</p>'
    ];

    const mournScale = [
      '<p align="left">Definitely do not use the song to mourn the dead</p>',
      ' ',
      ' ',
      ' ',
      ' ',
      '<p align="left">Definitely use the song to mourn the dead</p>'
    ];

    const loveScale = [
      '<p align="left">Definitely do not use the song to express love for another person</p>',
      ' ',
      ' ',
      ' ',
      ' ',
      '<p align="left">Definitely use the song to express love for another person</p>'
    ];

    const healingScale = [
      '<p align="left">Definitely do not use the song to heal illness</p>',
      ' ',
      ' ',
      ' ',
      ' ',
      '<p align="left">Definitely use the song to heal illness</p>'
    ];

    const sootheScale = [
      '<p align="left">Definitely do not use the song to soothe a baby</p>',
      ' ',
      ' ',
      ' ',
      ' ',
      '<p align="left">Definitely use the song to soothe a baby</p>'
    ];

    const birthdayScale = [
      '<p align="left">Definitely do not use the song to celebrate a birthday</p>',
      ' ',
      ' ',
      ' ',
      '',
      '<p align="left">Definitely use the song to celebrate a birthday</p>'
    ];

    let arr = [];
    let audio = {};
    let questions = {};
    let file = '';

    for (let i in stims) {
      file = stims[i];
      audio = {
        type: 'audio-keyboard-response',
        stimulus: `${baseUrl}/quizzes/listener-quiz/audio/${file}`,
        timing_response: 15000,
        response_ends_trial: false,
        trial_ends_after_audio: true,
        choices: [],
        prompt:
          '<p align="left">Please listen to the song excerpt and answer the questions that will follow when complete.</p>'
      };
      let newQuestions = jsPsych.randomization.shuffle([
        {
          prompt: 'Think of the singer(s). I think that the singers...',
          labels: danceScale,
          required: true
        },
        {
          prompt: 'Think of the singer(s). I think that the singers...',
          labels: storyScale,
          required: true
        },
        {
          prompt: 'Think of the singer(s). I think that the singers...',
          labels: mournScale,
          required: true
        },
        {
          prompt: 'Think of the singer(s). I think that the singers...',
          labels: loveScale,
          required: true
        },
        {
          prompt: 'Think of the singer(s). I think that the singers...',
          labels: healingScale,
          required: true
        },
        {
          prompt: 'Think of the singer(s). I think that the singers...',
          labels: sootheScale,
          required: true
        }
      ]);
      newQuestions.push({
        prompt: 'Did you have trouble hearing this song excerpt?',
        labels: ['<p>Yes</p>', '<p>No</p>']
      });
      questions = {
        type: 'survey-likert',
        questions: newQuestions
      };
      arr.push(audio);
      arr.push(questions);
    }
    return arr;
  }

  componentDidMount() {
    /* access to class in inline functions */
    const _this = this;

    /* jspsych timeline */
    const explain_requirements = {
      type: 'instructions',
      pages: [
        '<p align="left">This study involves listening to sound. You will need to be able to use good quality headphones. Otherwise, you may not be able to complete the study. If you cannot do this, please do not proceed.</p><p>Press C to continue.</p>',
        '<p align="left">On the next screen, you will hear a calibration tone. Listen to the tone, and turn up the volume on your computer until the calibration tone is at a loud but comfortable level. <p>Press C when you are ready to continue to the tone.</p>'
      ],
      show_clickable_nav: true,
      key_forward: 'c',
      allow_backward: false
    };

    const calibration_audio = {
      type: 'audio-keyboard-response',
      stimulus: `${baseUrl}/quizzes/listener-quiz/audio/noise_calib_stim.wav`,
      choices: ['c'],
      response_ends_trial: true,
      prompt:
        '<p align="left">Adjust the volume on your computer until the tone is at a loud but comfortable level. When you are satisfied, press <b>C</b> to continue.</p>'
    };

    const headphone_instructions = {
      type: 'instructions',
      pages: [
        `
            <p align="left">
                In the following section, we will play you sequences of 3 tones, and then ask you which of the tones in each sequence was the QUIETEST/SOFTEST.
            </p>
            <p align="left">
                There will be 6 total sequences about which you will be asked.
            </p>
            <p align="left">
                The tones will only be played once, so listen carefully!
            </p>
            <p>
                Press C to continue to the first sequence.
            </p>
            `
      ],
      key_forward: 'c',
      allow_backward: false
    };

    const explain = {
      type: 'instructions',
      pages: [
        `
          <p align="left">
            In this study, you will listen to excerpts from songs. Each excerpt will be 14 seconds long. You will then answer 6 questions after listening to each excerpt.
          </p>
          <p align="left">
            The experiment will begin with a set of training questions concerning an example excerpt. This will have a similar format to the questions that you will see as part of the study.i
          </p> 
          <p>
            Press C to continue.
          </p>
          `
      ],
      key_forward: 'c'
    };

    const practice_audio = {
      type: 'audio-keyboard-response',
      stimulus: `${baseUrl}/quizzes/listener-quiz/audio/NAIV-birthday.mp3`,
      timing_response: 10000,
      response_ends_trial: false,
      prompt:
        '<p align="left">Please listen to the song excerpt and answer the questions that will follow when complete.</p>',
      trial_ends_after_audio: true
    };

    const practice_question = {
      type: 'survey-multi-choice',
      required: [true],
      questions: [
        {
          prompt: 'Think of the singer(s). I think that the singers...',
          options: [
            '<span class="p">Definitely do not use the song to celebrate a birthday</span>',
            '<span class="p">Definitely use the song to celebrate a birthday</span>'
          ]
        }
      ],
      correct: [
        '<span class="p">Definitely use the song to celebrate a birthday</span>'
      ],
      force_correct: true
    };

    const ready = {
      type: 'instructions',
      pages: [
        `<p align="left">
          You are now ready to start the study. There will be 36 song excerpts for you to listen to.
        </p>
        <p>
          Press C to continue. Good luck!
        </p>`
      ],
      key_forward: 'c'
    };

    const checks = {
      type: 'survey-multi-choice',
      required: [true, true, true, true, true],
      questions: [
        {
          prompt:
            'What color is the sky? Please answer this incorrectly ON PURPOSE, by choosing RED instead of blue.',
          options: [
            '<span class="p">Green</span>',
            '<span class="p">Red</span>',
            '<span class="p">Blue</span>',
            '<span class="p">Yellow</span>'
          ]
        },
        {
          prompt:
            'Did you wear headphones while listening to the sounds in this study?',
          options: ['<span class="p">Yes</span>', '<span class="p">No</span>']
        },
        {
          prompt:
            'Please tell us about the place where you worked on this study. Please answer honestly.',
          options: [
            '<span class="p">I worked on this study in a very noisy place</span>',
            '<span class="p">I worked on this study in a somewhat noisy place</span>',
            '<span class="p">I worked on this study in a somewhat quiet place</span>',
            '<span class="p">I worked on this study in a very quiet place</span>'
          ]
        },
        {
          prompt:
            'Please tell us about whether you had difficulty loading the sounds. Please answer honestly.',
          options: [
            '<span class="p">There were problems loading all of the sounds</span>',
            '<span class="p">There were problems loading most of the sounds</span>',
            '<span class="p">There were problems loading some of the sounds</span>',
            '<span class="p">There were no problems loading any of the sounds</span>'
          ]
        },
        {
          prompt: 'How carefully did you complete this survey?',
          options: [
            '<span class="p">Not carefully at all</span>',
            '<span class="p">Slightly carefully</span>',
            '<span class="p">Moderately carefully</span>',
            '<span class="p">Quite carefully</span>',
            '<span class="p">Very carefully</span>'
          ]
        }
      ],
      correct: ['NA', 'NA', 'NA', 'NA', 'NA']
    };

    const finishedTrial = {
      type: 'instructions',
      pages: [
        `
          <p align="left">
            You have now completed the study. Thanks for your participation!
          </p>
          <p>
            Press C to finish.
          </p>
        `
      ],
      key_forward: 'c'
    };

    const timeline = [];
    const dataArray = [];
    let stims;
    let user;
    // timeline.push(practice4b);

    axiosListenerQuiz
      .post('/getAllStimuli', { user: { id: this.props.user.id } })
      .then(function(res) {
        _this.hideLoading();
        stims = res.data.stimuli;
        user = res.data.user;
      })
      .then(() => {
        timeline.push(explain_requirements);
        timeline.push(calibration_audio);
        timeline.push(headphone_instructions);
      })
      .then(() => {
        const headphone_check = this.getHeadphoneCheck();
        for (let i in headphone_check) {
          timeline.push(headphone_check[i]);
        }
      })
      .then(() => {
        timeline.push(explain);
        timeline.push(practice_audio);
        timeline.push(practice_question);
        timeline.push(ready);
      })
      .then(() => {
        const trials = this.getTrials(stims);
        for (let i in trials) {
          timeline.push(trials[i]);
        }
      })
      .then(() => {
        timeline.push(checks);
        timeline.push(finishedTrial);
      })
      .then(() => {
        // ******************************************
        var self = this;
        let index = 0;
        // this is the recursion function that works jsPsych magic
        // beaware that the timeline is already formated at this point, if it is for a different quiz you might have to do something different to format the timeline
        // do a console.log(timeline) to see the listener quiz timeline
        var customOnFinish = function(data) {
          //pause the experiment before the new node is added
          jsPsych.pauseExperiment();
          return Promise.resolve()
            .then(() => {
              const trialIndex = data['trial_index'];
              dataArray.push(data);
              if (data['trial_index'] > 15) {
                //data for link, it must include the question and the choices comes with this question
                //in the case of listener quiz, since the question and the choices are using different jspsych plugin
                //they come in 2 objects in the timeline
                //in the future, if the choices are included in the timeline please get the format like "dataToSaveForLink" below to properly save whats needed in the db
                //this has nothing to do with jsPsych this is just for a feature we need on the forum
                self.props.mountCurrentQuestion({
                  question: timeline[data['trial_index']],
                  choices: timeline[data['trial_index'] + 1]
                });
              }
              // in the listener quiz jon is posting answers to 2 different end points
              // this might be different depend on how you setup your endpoint
              if (
                data['trial_index'] == 5 ||
                data['trial_index'] == 7 ||
                data['trial_index'] == 9 ||
                data['trial_index'] == 11 ||
                data['trial_index'] == 13 ||
                data['trial_index'] == 15
              ) {
                const toSend = data;
                const fullStim = dataArray[dataArray.length - 2]['stimulus'];
                const sendStim = fullStim.split('/')[
                  fullStim.split('/').length - 2
                ];
                toSend['stimulus'] = sendStim;
                toSend['description'] = 'headphone check';
                self.props.setCount();
                return axiosListenerQuiz
                  .post('/response', {
                    user_id: self.props.user.id,
                    data_string: toSend
                  })
                  .then(function(res) {
                    //this is for saving temperary answers from a anonymous user incase the user choose to login in the middle of the quiz
                    self.props.dispatchTempResponse({
                      user_id: self.props.user.id,
                      data_string: toSend
                    });
                  });
              } else if (data['responses']) {
                // responses for trial stimuli
                if (
                  data['responses'].includes(
                    'Definitely do not use the song to express love for another person'
                  )
                ) {
                  const fullStim = dataArray[dataArray.length - 2]['stimulus'];
                  const sendStim = fullStim.split('/')[
                    fullStim.split('/').length - 1
                  ];

                  const toSend = data;
                  toSend['description'] = `responses for stimulus ${sendStim}`;
                  self.props.setCount();
                  return axiosListenerQuiz
                    .post('/stimulusResponse', {
                      user_id: self.props.user.id,
                      stimulus: sendStim,
                      data_string: data
                    })
                    .then(function(res) {
                      //this is for saving temperary answers from a anonymous user incase the user choose to login in the middle of the quiz
                      self.props.dispatchTempResponse({
                        user_id: self.props.user.id,
                        stimulus: sendStim,
                        data_string: data
                      });
                    });
                } else if (
                  data['responses'].includes('What color is the sky?')
                ) {
                  // post study questions
                  const toSend = data;
                  toSend['description'] = 'post study questions';
                  self.props.setCount();

                  return axiosListenerQuiz
                    .post('/response', {
                      user_id: self.props.user.id,
                      data_string: toSend
                    })
                    .then(function(res) {
                      //this is for saving temperary answers from a anonymous user incase the user choose to login in the middle of the quiz
                      self.props.dispatchTempResponse({
                        user_id: self.props.user.id,
                        data_string: toSend
                      });
                    });
                }
              }
            })
            .then(() => {
              //returns the next question inline for jsPsych to add to the timeline
              //returns the customOnFinish function itself to make it recursive
              //the next question in line could be a random question you can get a random question from the timeline and feed it to jsPsych
              return {
                ...timeline[++index], //you may change this line to a random question or fetch a new question from the db to add to the timeline
                on_finish: customOnFinish //this line is a must
              };
            })
            .then(res => {
              //start adding question to the end of timeline
              jsPsych.addNodeToEndOfTimeline(res, () => {
                //resume experiment after its done
                jsPsych.resumeExperiment();
              });
            });
        };
        //this is the initial timeline that holds only the first question in the timeline in it
        //on_finish tells what jsPsych needs to do when this question is completed, in our case we want to call customOnFinish to recursively add a new question to the timeline
        const loop_node = {
          timeline: [
            {
              ...timeline[0],
              on_finish: data => {
                customOnFinish(data);
              }
            }
          ]
        };
        jsPsych.init({
          display_element: this.refs.jsPsychTarget,
          //init jsPsych with the initial timeline with the onfinish function
          timeline: [loop_node]
        });
      });
  }

  render() {
    const loading = this.state.loading;
    if (!this.props.children) {
      return (
        <div>
          <div id="jsPsychContainer">
            {/* this is important for having an event to bind to that signifies when the dom is totally finished loading and thus you can actually get ths size of various elements. i would set margins entirely with css, but things don't end up firing at the right time, and they use null heights, etc. in this case, i'm using it to center the jsPsych div between the header and footer if there's excess whitespace. */}
            <ReactResizeDetector
              handleWidth
              handleHeight
              onResize={this.onResize}
            />

            <link
              rel="stylesheet"
              type="text/css"
              href={`${baseUrl}/css/jspsych.css`}
            />

            <div ref="preamble" id="preamble">
              <div style={{ display: loading ? '' : 'none' }}>
                <p className={s.loading}>
                  <b>Loading...</b>
                </p>
              </div>

              <div style={{ display: loading ? 'none' : '' }}>
                <p className={s.title}>The Listener Quiz</p>
                <hr className={s.divider} />
              </div>
            </div>

            <div ref="jsPsychTarget" id="jsPsychTarget" />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default listenerQuiz;
/* eslint-disable max-len */
