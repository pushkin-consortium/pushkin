import React, { Component } from 'react';
import { Field, reduxForm } from 'redux-form';
import LANGUAGES from './LANGUAGES';
import validate from './validate';

import s from './styles.css';
const OPTIONS = [{ label: 'From Birth', value: 0 }];
for (let i = 1; i <= 100; i++) {
  OPTIONS.push({
    label: i,
    value: i
  });
}
export class CommentFormPart2 extends Component {
  render() {
    const { handleSubmit, pristine, reset, submitting } = this.props;

    return (
      <div>
        <form onSubmit={this.props.handleSubmit}>
          <div className="row">
            <div className="col-xs-12">
              <h3>
                How did we do? train our algorithm by answering a few questions
              </h3>
            </div>
          </div>
          <div className="row">
            <div className="col-xs-6">
              <label htmlFor="yearsLived">
                Total years lived in an English-speaking country
                <Field
                  name="englishYears"
                  component={englishYears => (
                    <select {...englishYears.input} required>
                      <option value="" disabled>
                        Please select years
                      </option>
                      {OPTIONS.map(option => (
                        <option value={option.value}>{option.value}</option>
                      ))}
                    </select>
                  )}
                />
              </label>
            </div>
          </div>
          <div className="row">
            <div className="col-xs-6">
              <label htmlFor="householdEnglish">
                Does anyone in your home (spouse, child, etc?) speak mostly
                English?
                <Field
                  name="householdEnglish"
                  component={householdEnglish => (
                    <select type="text" {...householdEnglish.input}>
                      <option value="" disabled>
                        Please select english speakers
                      </option>
                      {[
                        { label: 'yes', value: true },
                        { label: 'no', value: false }
                      ].map(option => (
                        <option value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  )}
                />
              </label>
            </div>
          </div>
          <div className="row">
            <div className="col-xs-12">
              <button
                className={'btn btn-success ' + s.nextbutton}
                disabled={pristine || submitting}
                type="submit"
              >
                Next
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}

export default reduxForm({
  form: 'comments', // <------ same form name
  destroyOnUnmount: false
})(CommentFormPart2);
