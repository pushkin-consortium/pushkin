/**
 * React Static Boilerplate
 * https://github.com/kriasoft/react-static-boilerplate
 *
 * Copyright © 2015-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import { Row, Col, Image } from "react-bootstrap";
import React, { PropTypes } from "react";
import s from "./styles.css";

class HomePage extends React.Component {
  render() {
    return (
      <div>
        <div className={s.white}>
          <Row className={s.display}>
            <Col sm={12} lg={6} className={s.textCenter}>
              <Image
                src={require("../../gif/3.gif")}
                responsive
                className={s.gif}
              />
            </Col>
            <Col sm={12} lg={5} className={s.textCenter}>
              <p className={s.title}>
                <b>Contribute to linguistics research.</b>
              </p>
              <p className={s.blurb}>
                With modern technology, it is the perfect time for professional
                and amateur scientists to collaborate. Together, we can explore
                the human mind by tackling the most pressing questions about our
                ability to acquire and learn language. What are you waiting for?
              </p>
            </Col>
          </Row>
        </div>
        <div className={s.tan}>
          <Row className={s.display}>
            <Col lg={1} />
            <Col lg={5} className={s.textCenter}>
              <p className={s.title} style={{ marginTop: "90px" }}>
                <b>Collaborate with citizen scientists.</b>
              </p>
              <p className={s.blurb}>
                It doesn't matter who you are. Join our interdisciplinary team
                of psychologists, computer scientists, and linguists today.
                Whether it's contributing to our blog or posting a question in
                the forum, you can advance science and mingle with people who
                are just as interested in research as you are.
              </p>
            </Col>
            <Col lg={6} className={s.textCenter}>
              <Image
                style={{ marginTop: "90px" }}
                src={require("../../gif/2.gif")}
                responsive
                className={s.gif}
              />
            </Col>
          </Row>
        </div>
        <div className={s.white}>
          <Row className={s.display}>
            <Col sm={12} lg={6} className={s.textCenter}>
              <Image
                src={require("../../gif/1.gif")}
                responsive
                className={s.gif}
              />
            </Col>
            <Col sm={12} lg={5} className={s.textCenter}>
              <p className={s.title}>
                <b>Discover new findings and learn.</b>
              </p>
              <p className={s.blurb}>
                As volunteer scientists, you deserve to know the various
                exciting results produced from the lab. Head on over to the blog
                for articles, subscribe to our mailing list, and get ready to
                unlock the mysteries of human language.
              </p>
            </Col>
          </Row>
        </div>
      </div>
    );
  }
}

export default HomePage;
