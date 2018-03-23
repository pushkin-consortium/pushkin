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
import { Link } from "react-router";

class ProjectPage extends React.Component {
  render() {
    if (!this.props.children) {
      return (
        <div>
          <Image
            style={{ display: "none" }}
            src={require("../../img/favicon.ico")}
          />
          <div>
            <Row>
              <Col xs={12}>
                <div className={s.blurb}>
                  <p className={s.sub}>
                    Want to participate in science not just as a subject but as
                    a researcher? Professional researchers are increasingly{" "}
                    <a href="http://en.wikipedia.org/wiki/Citizen_science">
                      turning to amateurs
                    </a>{" "}
                    to solve critical scientific problems. Help out with one of
                    our projects below.
                  </p>
                  <hr />
                  {/*<p className={s.sub} style={{marginLeft:'20px', marginRight:'20px'}} ><Link className={s.title} to="/projects/verbcorner">VerbCorner</Link><br />Help us crowdsource the structure of language, meaning, and thought</p>*/}
                  <p
                    className={s.sub}
                    style={{ marginLeft: "20px", marginRight: "20px" }}
                  >
                    <a
                      className={s.title}
                      href="http://archive.gameswithwords.org/VerbCorner"
                    >
                      VerbCorner
                    </a>
                    <br />Help us crowdsource the structure of language,
                    meaning, and thought
                  </p>
                  <hr />
                  <p className={s.sub}>
                    More coming soon... In the meantime, check{" "}
                    <a href="http://scistarter.org">SciStarter.org</a> for more
                    &quot;citizen science&quot; projects.
                  </p>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ProjectPage;
