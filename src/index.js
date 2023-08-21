import axios from 'axios';

export default class Pushkin {
  constructor() {
    this.con = undefined;
  }

  connect(quizAPIUrl) {
    this.con = axios.create({
      baseURL: quizAPIUrl,
    });
  }

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(`Loading timed out for ${url}`), 5000);

      // check if this script is already loaded and reload if it is
      // can't use array 'has' because getElements doesn't return an array
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src == url) scripts[i].parentNode.removeChild(scripts[i]);
      }

      const script = document.createElement('script');
      script.onload = () => {
        clearTimeout(timeout);
        resolve(script);
      };
      script.src = url;
      document.body.appendChild(script);
    });
  }

  loadScripts(urls) { return Promise.all(urls.map(this.loadScript)); }


  tabulateAndPostResults(userID, experiment) {
    const postData = {
      user_id: userID,
      experiment,
    };
    return this.con.post('/tabulateAndPostResults', postData);
  }

  prepExperimentRun(userID) {
    const postData = {
      user_id: userID,
    };
    return this.con.post('/startExperiment', postData);
  }

  getAllStimuli(userID, nItems) {
    const postData = {
      user_id: userID,
      nItems,
    };
    return this.con.post('/getStimuli', postData)
      .then((res) => {
        return JSON.parse(res).data.resData; //send back just the stimuli
      });
  }

  setSaveAfterEachStimulus(stimuli) {
    return stimuli.map((s) => ({
      ...s,
      // If s already has an on_finish, wrap it in a function that calls both
      // the original on_finish and the saveStimulusResponse function
      on_finish: (data) => {
        if (s.on_finish) s.on_finish(data); // If s already has an on_finish, call it
        return this.saveStimulusResponse.bind(this)(data); // bind(this) is necessary because of `this` in saveStimulusResponse
      }
    }));
  }

  saveStimulusResponse(data) {
    // Because we are saving data, it should be coming with a userID already
    // Might make sense at some point to confirm this is what we expect
    let stimulus;
    try {
      stimulus = data.stimulus;
    } catch (e) {
      throw new Error('jsPsych data does not include a stimulus key');
    }
    let user_id;
    try {
      user_id = data.user_id;
    } catch (e) {
      throw new Error('req does not include a user_id');
    }
    const postData = {
      user_id,
      data_string: data,
      stimulus,
    };
    return this.con.post('/stimulusResponse', postData);
  }

  insertMetaResponse(data) {
    let metaQuestion;
    try {
      metaQuestion = data.stimulus;
    } catch (e) {
      throw new Error('jsPsych data does not include a stimulus key');
    }
    let user_id;
    try {
      user_id = data.user_id;
    } catch (e) {
      throw new Error('req does not include a user_id');
    }
    const postData = {
      user_id,
      data_string: data,
      metaQuestion,
    };
    return this.con.post('/insertMetaResponse', postData);
  }

  endExperiment(userID) {
    const postData = {
      user_id: userID,
    };
    return this.con.post('/endExperiment', postData);
  }

  customApiCall(path, data, httpMethod) {
    httpMethod = httpMethod || 'post';
    return new Promise((resolve, reject) => {
      this.con[httpMethod](path, data)
        .then((response) => {
          // parse it if it's JSON, leave it otherwise
          try { response = JSON.parse(response); } catch (e) { }
          const resData = response.data && response.data.resData ? response.data.resData : null;
          resolve(resData);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
