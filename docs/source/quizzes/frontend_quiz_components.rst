.. _`frontend_quiz_components`:

Frontend Quiz Components
=============================

jsPsych Plugins
---------------

Each trial requires a jsPsych plugin to provide the assets and functions necessary to run a certain experimental paradigm. The quiz template page contains the following require statements, which point towards the jsPsyc folder contained in front-end/src/quizzes/libraries :

.. code:: javascript

    # This makes jsPsych core code available. It is needed for all plugins. 
    require('../libraries/jsPsych/jspsych.js');

    # This makes code associated with a single plugin available. It is needed for a trial of a specific type. 
    require('../libraries/jsPsych/plugins/jspsych-instructions.js');


Plugins are used as templates for single trials. They offer a range of question types, from multiple choice and likert scales to custom variants which can be created and added as required.

For more information, please refer to jsPsych's official documentation_. 

.. _documentation: https://www.jspsych.org/tutorials/hello-world/

Creating Trials
---------------

Trials are defined and located in ``quiz_files/jsPsychTimeline.js``. This file exports the trials as a single array, referred to as a timeline. The timeline is fed to a jsPsych init function, which then proceeds to execute the trials in order.

Below is a sample trial. It is helpful to reference the source code of the plugin which you wish to use, in the jsPsych folder, in order to understand the requirements of the trial. In general, each can be described as an object with defined parameters, typically provided with strings of HTML/CSS for formatting, and arrays of strings, images, and audiofiles to serve as stimuli/answer options for that trial. 

.. code:: javascript

    # A relatively simple trial which serves only to display instructions. 
    const intro = {
        type: 'instructions',
        pages: [" <p align='left'> A sample paragraph written in HTML! </p>"],
        show_clickable_nav: true,
        button_label_next:'Continue'
    };

    # A more complicated trial designed to provide feedback and social-media-sharing options. 
    var const testingTrial = {
        type: 'display-prediction',
        prompt1: "Nuestras tres mejores conjecturas para su lengua materna:",
        prompt2: "Nuestras tres mejores conjecturas para su dialecto español:",
        prediction1: ['Guess1', 'Guess2', 'Guess3'],
        prediction2: ['Guess11', 'Guess22', 'Guess33'],
        buttonText: 'Terminar',
        quizURL: 'http://www.gameswithwords.org/WhichEnglish/',
        subjectLine: 'Mapeando la gramática española por el mundo entero',
        teaserPart1: "Ayudé a GamesWithWords.org a entrenar su algoritmo a adivinar qué español hablo. Adivinó que mi lengua materna es ",
        teaserPart2: " y que ",
        teaserPart3: " es mi dialecto. Cual español hablas?",
        socialSharing: false,
        encourageDemographics: 'Por favor continúa para contestar algunas preguntas y para ayudarnos a entrenar nuestro algoritmo!',
        mailButtonImg: `${baseUrl}/quizzes/email.png`,
        fbButtonImg: `${baseUrl}/quizzes/fb.png`,
        twitterButtonImg: `${baseUrl}/quizzes/twitter.png`,
        weiboButtonImg: `${baseUrl}/quizzes/weibo.png`,
    }

To create a new trial, simply declare it in ``jsPsychTimeline.js``, and then choose where to insert it into the timeline. 

Saving Data
------------

Data saving is carried out automatically by Axios calls within the quiz/index.js. Only advanced users should attempt to edit the endpoints to provide functionality other than basic database reading and writing. 




