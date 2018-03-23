import { Row, Col, Image } from "react-bootstrap";
import { Link } from "react-router";
import React, { PropTypes } from "react";
import history from "../../core/history";
import s from "./styles.css";

class MobileNotSupported extends React.Component {
  static propTypes = {
    error: React.PropTypes.object
  };

  goBack = event => {
    event.preventDefault();
    history.goBack();
  };

  render() {
    return (
      <div>
        <div>
          <Row>
            <Col xs={12}>
              <br />
              <div className={s.center} ref="message">
                <p className={s.title}>
                  We're sorry, but the page you requested isn't supported on
                  mobile devices yet. We're working hard to update this, so
                  please check back soon!
                </p>
                <br />
                <p className={s.title}>
                  You can either{" "}
                  <a href="/" onClick={this.goBack}>
                    go back
                  </a>, or select an option from the menu above.
                </p>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    );
  }
}

export default MobileNotSupported;
