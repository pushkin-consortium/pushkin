import React from 'react';
import { Button } from 'react-bootstrap';
import s from './styles.css';
import { last } from 'lodash'
import Axios from 'axios'
const api = Axios.create({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? '/api'
      : '//localhost/api'
})

class StaticQuestionContainer extends React.Component {
  componentDidMount() {
    //handle timeline base on if the question is saved as {question: {}, choices:{}}
    //this is due to different jsPsych plug in type
    //the current listener quiz is handling the question and choices in 2 different plugings
    //so the timeline needs to have 2 objects to proper display the question and the chlices
    let timeline;
    const { question } = this.props;
    // convert this to an absolute url instead of a relative
    // in the dev server which is running user webpack, prefix the url with localhost
    // this will then hit the main API service
    const submitURL = question.submitURL;
``
    if (this.props.question.choices) {
      timeline = [this.props.question.question, this.props.question.choices];
    } else {
      timeline = [this.props.question];

    }
    // get the last question, and hijack its `on_finish`
    last(timeline).on_finish = data => {
      // when we save a question in the db and it is attached to the forum
      // we include the url to submit responses too
      // in here we need to determine which quiz this is
     // then we post to /quiz-name/stimulusResponse
     // with { user_id, and data_string: data }

      console.log(`Here we submit to the DB using the saved ${submitURL}`);
      console.log(data)
      const payload = {
        data_string: data
      }
      if(this.props.userInfo) {
        payload.user_id = this.props.userInfo.profile.id
      }
      return api.post(submitURL, payload)
      .then(res => {
        console.log(res)
        this.props.closeQuestion();
      })
    }
    jsPsych.init({
      display_element: this.refs.jsPsychTarget,
      timeline: timeline
    });

  }
  render() {
    return (
      <div className={s['question-container']}>
        <div
          style={{ marginLeft: 20 }}
          ref="jsPsychTarget"
          id="jsPsychTarget"
        />
        <div style={{ marginLeft: 20 }}>
          <Button className="btn btn-danger" onClick={this.props.closeQuestion}>
            Close
          </Button>
        </div>
      </div>
    );
  }
}
export default StaticQuestionContainer;
