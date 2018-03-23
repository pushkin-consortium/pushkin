/**
 * jspsych-image-button-response
 * Josh de Leeuw
 *
 * plugin for displaying a stimulus and getting a keyboard response
 *
 * documentation: docs.jspsych.org
 *
 **/

window.allowDrop = function(event) {
  event.preventDefault();
  console.log(event.toElement.currentSrc);
};
/*
var drop = function(event) {

  if(event.toElement.currentSrc == "http://0.0.0.0:22362/static/images/mickey.jpg"){
    var choice = event.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
    console.log(event);
    console.log("mickey");
  }else if(event.toElement.currentSrc == "http://0.0.0.0:22362/static/images/trash.jpg"){
    var choice = event.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
    console.log(choice);
    console.log("trash");
  }
  console.log("drag drop success");
};


var drag = function(event){
   console.log("Testing drag inside");
   /*event.dataTransfer.setData("img", event.target.id);
};
*/

jsPsych.plugins['image-drag-response'] = (function() {
  var plugin = {};

  jsPsych.pluginAPI.registerPreload('image-drag-response', 'stimulus', 'image');

  plugin.info = {
    name: 'image-drag-response',
    description: '',
    parameters: {
      stimulus: {
        type: jsPsych.plugins.parameterType.IMAGE,
        pretty_name: 'Stimulus',
        default: undefined,
        description: 'The image to be displayed'
      },
      choices: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        pretty_name: 'Choices',
        default: [],
        array: true,
        description: 'The labels for the buttons.'
      },
      button_html: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Button html',
        default: '<button class="jspsych-btn">%choice%</button>',
        array: true,
        description: 'The html of the button. Can create own style.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: '',
        description: 'Any content here will be displayed under the button.'
      },
      stimulus_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Stimulus duration',
        default: -1,
        description: 'How long to hide the stimulus.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: -1,
        description: 'How long to show the trial.'
      },
      margin_vertical: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin vertical',
        default: '0px',
        description: 'The vertical margin of the button.'
      },
      margin_horizontal: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Margin horizontal',
        default: '8px',
        description: 'The horizontal margin of the button.'
      },
      response_ends_trial: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Response ends trial',
        default: true,
        description: 'If true, then trial will end when user responds.'
      },
      mickey_audio: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Audio for Mickey',
        default: undefined,
        description:
          'This is the sound played when the Mickey button is pressed!'
      },
      trash_audio: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Audio for trash',
        default: undefined,
        description:
          'This is the sound played when the trash button is pressed!'
      }
    }
  };

  plugin.trial = function(display_element, trial) {
    jsPsych.getDisplayElement().style.touchAction = 'none';
    if (typeof trial.choices === 'undefined') {
      console.error(
        'Required parameter "choices" missing in image-button-response'
      );
    }
    if (typeof trial.stimulus === 'undefined') {
      console.error(
        'Required parameter "stimulus" missing in image-button-response'
      );
    }

    // display stimulus
    var html = '';

    var context = jsPsych.pluginAPI.audioContext();
    var source = null;
    var audio = null;

    //display buttons
    var buttons = [];
    if (Array.isArray(trial.button_html)) {
      if (trial.button_html.length == trial.choices.length) {
        buttons = trial.button_html;
      } else {
        console.error(
          'Error in image-drag-response plugin. The length of the button_html array does not equal the length of the choices array'
        );
      }
    } else {
      for (var i = 0; i < trial.choices.length; i++) {
        buttons.push(trial.button_html);
      }
    }
    html += '<div id="custom-image-drag-response-btngroup"></div>';
    display_element.innerHTML = html;
    for (var i = 0; i < trial.choices.length; i++) {
      var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
      display_element
        .querySelector('#custom-image-drag-response-btngroup')
        .insertAdjacentHTML(
          'beforeend',
          '<div class="custom-image-drag-response-button dropzone" style="display: inline-block; margin:' +
            trial.margin_vertical +
            ' ' +
            trial.margin_horizontal +
            '" id="custom-image-drag-response-button-' +
            i +
            '" data-choice="' +
            i +
            '">' +
            str +
            '</div>'
        );

      interact('.dropzone').dropzone({
        // only accept elements matching this CSS selector
        // Require a 75% element overlap for a drop to be possible
        overlap: 0.75,

        ondropactivate: function(event) {
          // add active dropzone feedback
          event.target.classList.add('drop-active');
        },
        ondragenter: function(event) {
          var draggableElement = event.relatedTarget,
            dropzoneElement = event.target;

          // feedback the possibility of a drop
          dropzoneElement.classList.add('drop-target');
          draggableElement.classList.add('can-drop');
          draggableElement.textContent = 'Dragged in';
        },
        ondragleave: function(event) {
          // remove the drop feedback style
          event.target.classList.remove('drop-target');
          event.relatedTarget.classList.remove('can-drop');
          event.relatedTarget.textContent = 'Dragged out';
        },
        ondrop: function(event) {
          event.relatedTarget.textContent = 'Dropped';
          console.log('DROPPPED');
        },
        ondropdeactivate: function(event) {
          // remove active dropzone feedback
          event.target.classList.remove('drop-active');
          event.target.classList.remove('drop-target');
        }
      });
      display_element
        .querySelector('#custom-image-drag-response-button-' + i)
        .addEventListener('drop', function(e) {
          var btns = document.querySelectorAll(
            '.custom-image-drag-response-button button'
          );
          for (var i = 0; i < btns.length; i++) {
            //btns[i].removeEventListener('click');
            btns[i].setAttribute('disabled', 'disabled');
          }

          if (
            event.toElement.currentSrc.split('/')[
              event.toElement.currentSrc.split('/').length - 1
            ] == 'mickey.jpg'
          ) {
            display_element.querySelector(
              '#custom-image-drag-response-stimulus'
            ).style.visibility =
              'hidden';

            if (context !== null) {
              source = context.createBufferSource();
              source.buffer = jsPsych.pluginAPI.getAudioBuffer(
                trial.mickey_audio
              );
              source.connect(context.destination);
            } else {
              var audio = jsPsych.pluginAPI.getAudioBuffer(trial.mickey_audio);
              audio.currentTime = 0;
            }

            if (context !== null) {
              startTime = context.currentTime + 0.1;
              source.start(startTime);
            } else {
              audio.play();
            }

            jsPsych.pluginAPI.setTimeout(function() {
              after_response(trial.choices[0]);
            }, 2000);
          } else if (
            event.toElement.currentSrc.split('/')[
              event.toElement.currentSrc.split('/').length - 1
            ] == 'trash.jpg'
          ) {
            display_element.querySelector(
              '#custom-image-drag-response-stimulus'
            ).style.visibility =
              'hidden';

            if (context !== null) {
              source = context.createBufferSource();
              source.buffer = jsPsych.pluginAPI.getAudioBuffer(
                trial.trash_audio
              );
              source.connect(context.destination);
            } else {
              var audio = jsPsych.pluginAPI.getAudioBuffer(trial.trash_audio);
              audio.currentTime = 0;
            }

            if (context !== null) {
              startTime = context.currentTime + 0.1;
              source.start(startTime);
            } else {
              audio.play();
            }

            jsPsych.pluginAPI.setTimeout(function() {
              after_response(trial.choices[1]);
            }, 2000);
          }

          /*
        var choice = e.currentTarget.getAttribute('data-choice');
        after_response(choice);*/
        });
    }

    /* Testing draggable area */
    display_element.insertAdjacentHTML(
      'beforeend',
      '<p><img class="draggable" src="' +
        trial.stimulus +
        '" id="custom-image-drag-response-stimulus" ></img></p>'
    );

    //show prompt if there is one
    if (trial.prompt !== '') {
      display_element.insertAdjacentHTML('beforeend', trial.prompt);
    }

    interact('.draggable').draggable({
      inertia: true,
      // keep the element within the area of it's parent
      // enable autoScroll
      autoScroll: true,
      onmove: function(event) {
        var target = event.target;
        // keep the dragged position in the data-x/data-y attributes
        console.log(event.dy, event.dx);
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        // translate the element
        target.style.webkitTransform =
          target.style.transform =
          'translate(' + x + 'px, ' + y + 'px)';
        // update the posiion attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      }
    })


    // store response
    var response = {
      rt: -1,
      button: -1
    };

    // start time
    var start_time = 0;
    // function to handle responses by the subject
    function after_response(choice) {
      // measure rt
      var end_time = Date.now();
      var rt = end_time - start_time;
      response.button = choice;
      response.rt = rt;

      // after a valid response, the stimulus will have the CSS class 'responded'
      // which can be used to provide visual feedback that a response was recorded
      display_element.querySelector(
        '#custom-image-drag-response-stimulus'
      ).className +=
        ' responded';

      //this is where I imagine adding something about noise
      //if (response.button==MICKEY) play Mickey noise
      //if (response == TRASH) play trash noise
      // disable all the buttons after a response
      var btns = document.querySelectorAll(
        '.custom-image-drag-response-button button'
      );
      for (var i = 0; i < btns.length; i++) {
        //btns[i].removeEventListener('click');
        btns[i].setAttribute('disabled', 'disabled');
      }

      if (trial.response_ends_trial) {
        end_trial(choice);
      }
    }

    // function to end trial when it is time
    function end_trial(choice) {
      // kill any remaining setTimeout handlers
      // jsPsych.pluginAPI.clearAllTimeouts();

      // gather the data to store for the trial
      var trial_data = {
        rt: response.rt,
        stimulus: trial.stimulus,
        button_pressed: choice
      };
      console.log(trial_data);
      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    }

    // start timing
    start_time = Date.now();

    // hide image if timing is set
    if (trial.stimulus_duration > 0) {
      jsPsych.pluginAPI.setTimeout(function() {
        display_element.querySelector(
          '#custom-image-drag-response-stimulus'
        ).style.visibility =
          'hidden';
      }, trial.stimulus_duration);
    }

    // end trial if time limit is set
    if (trial.trial_duration > 0) {
      jsPsych.pluginAPI.setTimeout(function() {
        end_trial();
      }, trial.trial_duration);
    }
  };

  return plugin;
})();
