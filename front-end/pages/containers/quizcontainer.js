import React, { Component } from "react";
// import Header from '../components/Layout/Header';

import { connect } from "react-redux";

class QuizContainer extends Component {
  render() {
    return (
      <div>
        <div className="container-fluid">{this.props.children}</div>
      </div>
    );
  }
}
export default connect(state => state)(QuizContainer);
