/* eslint-disable react/prop-types */
import React, { Component, PropTypes } from 'react';
import s from './style.css';

export default class MultiSelect extends Component {
  static propTypes = { options: PropTypes.array.isRequired };
  constructor(props) {
    super(props);
    this.state = { tokens: [], value: '' };
  }
  getTokens = () => this.state.tokens;
  render() {
    return (
      <div>
        {this.props.value.length > 0 &&
          this.props.value.map(token => (
            <span className={s.token}>
              {token}
              <span
                className={s.closeButton}
                onClick={() => {
                  const index = this.props.value.indexOf(token);
                  const tokens = [
                    ...this.props.value.slice(0, index),
                    ...this.props.value.slice(index + 1)
                  ];
                  this.props.onChange(tokens);
                }}
              >
                x
              </span>
            </span>
          ))}
        <select
          defaultValue=""
          value={this.state.value}
          onChange={e =>
            this.props.onChange([...this.props.value, e.target.value])}
        >
          <option disabled value="">
            {this.props.defaultMessage}
          </option>
          {this.props.options
            .filter(option => this.state.tokens.indexOf(option) < 0)
            .map(option => <option value={option}>{option}</option>)}
        </select>
      </div>
    );
  }
}
