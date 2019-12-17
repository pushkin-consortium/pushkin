// react imports
import React from 'react';
//import PropTypes from 'prop-types';
import { LinkContainer } from 'react-router-bootstrap';

// styling
import s from './styles.css';
//import { Row, Image, Card, Media, Button, Table } from 'react-bootstrap'; //  Clearfix,
import { Row } from 'react-bootstrap'; //  Clearfix,

// components
const SHOW_TECHNICAL_DIFFICULTIES_MESSAGE = false;

function AboutPage(props) {
  if (!props.children) {
    return (
      <div id="page-wrap">
        <div>
          {/*
            --- Technical difficulties alert ---
            To enable / disable, please set constant at the top of the file to either true or false
          */}
          {SHOW_TECHNICAL_DIFFICULTIES_MESSAGE && (
            <div className={s.alert}>
              <div className="container">
                <p>
                  We’re currently experiencing unusually high traffic to
                  themusiclab.org, which may make it difficult to load our games
                  quickly. Sorry! We hope to have the problem fixed soon.
                </p>
              </div>
            </div>
          )}

          <div className={s.gray}>
            <div className="container">
              <p className={s.tan}>
                We do <strong>citizen science</strong> to learn how the the mind
                works.{' '}
                <strong>
                  We are awesome scientists!!
                  <br />
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return props.children;
}

export default AboutPage;
