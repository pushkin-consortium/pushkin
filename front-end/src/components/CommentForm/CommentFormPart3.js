import React, { Component } from 'react';
import { Field, reduxForm } from 'redux-form';
import COUNTRIES from './COUNTRIES';

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

class CommentFormPart3 extends Component {
  render() {
    const { handleSubmit, pristine, reset, submitting } = this.props;
    return (
      <form onSubmit={this.props.handleSubmit}>
        <div className="row">
          <div className="col-xs-12">
            <label htmlFor="">
              List any countries you have lived in for <strong>at least</strong>{' '}
              6 months
            </label>
            <Field
              name="countryOfResidence"
              defaultValue={['']}
              component={countryOfResidence => (
                <div>
                  <MultiSelect
                    defaultMessage={'Please Select a Country'}
                    {...countryOfResidence.input}
                    options={COUNTRIES.filter(
                      lang => countryOfResidence.input.value.indexOf(lang) < 0
                    )}
                  />
                  {countryOfResidence.meta.touched &&
                  countryOfResidence.meta.error ? (
                    <span className={s.validationMessage}>
                      {countryOfResidence.meta.error}
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
              type="submit"
              className={'btn btn-success ' + s.nextbutton}
              disabled={pristine || submitting}
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    );
  }
}
export default reduxForm({
  form: 'comments', // <------ same form name
  destroyOnUnmount: false,
  validate
})(CommentFormPart3);
