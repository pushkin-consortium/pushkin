import React, { Component } from 'react';
import { connect } from 'react-redux';
class ResultsList extends Component {
  render() {
    return (
      <div>
        <div className="row">
          <div className="col-xs-12">
            <h3>Results</h3>
          </div>
        </div>
        <div className="row">
          <div className="col-xs-6">
            {this.props.results.map((lang, index) => (
              <p>
                {index + 1}. : {lang.name}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
export default ResultsList;
