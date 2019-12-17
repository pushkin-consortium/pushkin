// import React
import React from 'react';
import { LinkContainer } from 'react-router-bootstrap';
//import PropTypes from 'prop-types';

//Styling
import s from './styles.css';
//import { Row, Col, Image, Card, Media, Button, Table } from 'react-bootstrap';
import { Col, Image, Card, Button } from 'react-bootstrap';

//unneeded imports?
//import * as f from 'react-foundation';
//import Axios from 'axios';
//import * as i from 'react-social-icons';
//import { CONFIG } from '../../../config';

export function SuggestTile(props) {
  return (
    <Col xs={12} sm={6} smOffset={props.center ? 3 : 0}>
      <div>
        <Card bsClass={s.panel}>
          <Card.Header>
            <div className={s.headerpadding}>
              <a className={s.title}>{props.title}</a>
            </div>
          </Card.Header>
          <Card.Body className={s.quizbox}>
            <div className={s.quizImgWrap}>
              <LinkContainer to={props.to}>
                <Image
                  src={props.img}
                  className="img-thumbnail"
                  style={{ backgroundColor: 'transparent', border: 0 }}
                  responsive
                />
              </LinkContainer>
            </div>
            <div className={s.quizText}>
              {props.children}
              <div className={s.buttonWrap}>
                <LinkContainer to="/feedback">
                  <Button bsStyle="danger">Submit suggestion</Button>
                </LinkContainer>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
      <br />
    </Col>
  );
}

//  export default SuggestTile;
