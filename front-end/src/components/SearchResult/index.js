import React from 'react'
const highlightTerm = 'strong';
import { Link } from 'react-router';
class SearchResult extends React.Component {
  // convert text into bold tags to highligh search terms
  formatter(str, term) {
    var termRegex = new RegExp(term, 'gi');
    return str
      .split(' ')
      .reduce((prev, curr) => {
        if (curr.match(termRegex)) {
          return prev + ` <${highlightTerm}>${curr}</${highlightTerm}>`;
        }
        return prev + ` ${curr}`;
      }, '')
      .trim();
  }

  render() {
    const { result, term } = this.props;
    switch (result.type) {
      case 'post':
        return (
          <div>
            <Link to={`forum/posts/${result.id}`}>
              <span
                dangerouslySetInnerHTML={{
                  __html: this.formatter(result.post_subject, term)
                }}
              />
            </Link>
          </div>
        );
      case 'comment':
        return (
          <div>
            <Link to={`forum/posts/${result.post_id}`}>
              <span
                dangerouslySetInnerHTML={{
                  __html: this.formatter(result.responses, term)
                }}
              />
            </Link>
          </div>
        );
    }
  }
}
export default SearchResult