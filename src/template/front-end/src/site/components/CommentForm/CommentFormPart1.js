import React, { Component } from 'react';
import { Field, reduxForm } from 'redux-form';
import LANGUAGES from './LANGUAGES';
import validate from './validate';

import MultiSelect from '../MultiSelect/MultiSelect';
import s from './styles.css';

const OPTIONS = [{ label: 'From Birth', value: 0 }];
for (let i = 1; i <= 100; i++) {
  OPTIONS.push({
    label: i,
    value: i
  });
}
class CommentFormPart1 extends Component {
  render() {
    const { handleSubmit, pristine, reset, submitting } = this.props;
    return (
      <div>
        <div className="row">
          <div className="col-xs-12">
            <h2>How Did we Do</h2>
          </div>
        </div>
        <form onSubmit={this.props.handleSubmit}>
          <div className="row">
            <div className="col-xs-12">
              <label htmlFor="learn_age">
                When did you start learning english?
                <Field
                  name="learnAge"
                  defaultValue=""
                  component={learnAge => (
                    <div>
                      <select {...learnAge.input}>
                        <option value="" disabled>
                          Select an Age
                        </option>
                        {OPTIONS.map(option => (
                          <option value={option.value} key={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {learnAge.meta.touched && learnAge.meta.error ? (
                        <span className={s.validationMessage}>
                          {learnAge.meta.error}
                        </span>
                      ) : null}
                    </div>
                  )}
                />
              </label>
            </div>
          </div>
          <div className="row">
            <div className="col-xs-12 col-sm-6">
              <label>
                List all <strong>native</strong> language(s){' '}
                <em>learned from birth</em>
              </label>
              <Field
                name="nativeLanguages"
                defaultValue={['']}
                component={nativeLanguages => (
                  <div>
                    <MultiSelect
                      defaultMessage={'Please Select a Language'}
                      {...nativeLanguages.input}
                      options={LANGUAGES.filter(
                        lang => nativeLanguages.input.value.indexOf(lang) < 0
                      )}
                    />
                    {nativeLanguages.meta.touched &&
                    nativeLanguages.meta.error ? (
                      <span className={s.validationMessage}>
                        {nativeLanguages.meta.error}
                      </span>
                    ) : null}
                  </div>
                )}
              />
            </div>
            <div className="col-xs-12 col-sm-6">
              <label>
                List all <strong>primary</strong> language(s){' '}
                <em>learned from birth</em>
              </label>
              <Field
                name="primaryLanguages"
                defaultValue={[]}
                component={primaryLanguages => (
                  <div>
                    <MultiSelect
                      defaultMessage={'Please Select a Language'}
                      {...primaryLanguages.input}
                      options={LANGUAGES.filter(
                        lang => primaryLanguages.input.value.indexOf(lang) < 0
                      )}
                    />
                    {primaryLanguages.meta.touched &&
                    primaryLanguages.meta.error ? (
                      <span className={s.validationMessage}>
                        {primaryLanguages.meta.error}
                      </span>
                    ) : null}
                  </div>
                )}
              />
            </div>
          </div>
          <div className="row">
            <div className="col-xs-12">
              <button
                className={'btn btn-success ' + s.nextbutton}
                type="submit"
                disabled={pristine || submitting}
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
  destroyOnUnmount: false, // <------ preserve form data
  validate
  // enableReinitialize: true,
})(CommentFormPart1);
