import {
  Row,
  Col,
  Clearfix,
  Image,
  Panel,
  Media,
  Button,
  Table
} from 'react-bootstrap';
import React from 'react';
import s from './styles.css';

class FeedbackPage extends React.Component {
  render() {
    return (
      <div id="page-wrap" className={s.nhs}>
{/*        <iframe
          className={s.iframe}
          height="1144px"
          src="https://docs.google.com/forms/d/e/1FAIpQLSeNolN1L2MuDqAQi8WlEoCEtTPyqXKv81TNRYWH95z09mz-dQ/viewform?embedded=true"
          frameBorder="0"
*/}        />
      EMBED GOOGLE FORM HERE (SEE /front-end/src/pages/feedback)
      </div>
    );
  }
}

export default FeedbackPage;
