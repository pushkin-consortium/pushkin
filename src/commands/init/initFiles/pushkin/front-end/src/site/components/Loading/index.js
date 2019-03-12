import React, { Component } from 'react';
import loading from './loading.svg';
import s from './styles.css';

class Loading extends Component {
  render() {
    return (
      <div className={s.loading}>
        <img src={loading} alt="loading" />
      </div>
    );
  }
}
export default Loading;
