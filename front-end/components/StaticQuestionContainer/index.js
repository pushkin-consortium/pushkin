import React from 'react';
import { Button } from 'react-bootstrap';
import s from './styles.css';

class StaticQuestionContainer extends React.Component {
  componentDidMount() {
    //handle timeline base on if the question is saved as {question: {}, choices:{}}
    //this is due to different jsPsych plug in type
    //the current listener quiz is handling the question and choices in 2 different plugings
    //so the timeline needs to have 2 objects to proper display the question and the chlices
    let timeline;
    if (this.props.question.choices) {
      timeline = [this.props.question.question, this.props.question.choices];
    } else {
      timeline = [this.props.question];
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
