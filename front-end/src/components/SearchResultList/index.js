import React from 'react'
import { Glyphicon, Button } from 'react-bootstrap';
import SearchResult from '../SearchResult'
import s from './styles.css'

class SearchResultList extends React.Component {
  render() {
    const { term, results, clearSearch } = this.props;
    return (
      <div className={s.searchResults}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <span>
            Search Term: <strong>{term}</strong>
          </span>
          <Button onClick={clearSearch}>
            <Glyphicon glyph="remove-sign" /> Clear Search
          </Button>
        </div>
        {results.map(result => <SearchResult result={result} term={term} />)}
      </div>
    );
  }
}
export default SearchResultList;