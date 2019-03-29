import React, { Component } from 'react';
import s from './styles.css';
import CommentFormPart1 from './CommentFormPart1';
import CommentFormPart2 from './CommentFormPart2';
import CommentFormPart3 from './CommentFormPart3';

export default class CommentForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 1
    };
  }
  nextPage = () => {
    this.setState({ page: this.state.page + 1 });
  };

  previousPage = () => {
    this.setState({ page: this.state.page - 1 });
  };

  final = input => {
    this.props.handleSubmit(input);
  };
  render() {
    switch (this.state.page) {
      case 1:
        return (
          <div className={s.commentForm}>
            {this.props.userInfo.isFetching && <h4>Loading...</h4>}
            {!this.props.userInfo.isFetching && (
              <CommentFormPart1 onSubmit={this.nextPage} />
            )}
          </div>
        );
      case 2:
        return <CommentFormPart2 onSubmit={this.nextPage} />;
      case 3:
        return <CommentFormPart3 onSubmit={this.final} />;
      default:
        return null;
    }
  }
}
