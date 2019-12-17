/**
 * React Static Boilerplate
 * https://github.com/kriasoft/react-static-boilerplate
 *
 * Copyright © 2015-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import React from 'react';
import { withRouter } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
//import * as i from 'react-social-icons';
import { Col } from 'react-bootstrap';
import s from './Footer.css';
import { CONFIG } from '../../config';

class Footer extends React.Component {
  render() {
    return (
      <div className={s.fixFooter}>
        <footer id="footer">
          <div className={s.footer}>
            <div className="container">
              <Col className={s.vert}>
                <div className={s.leftal}>
                  © 2019 {CONFIG.whoAmI}. All rights reserved.
                </div>
                <div className={s.rightal}>
                  <LinkContainer to="/feedback">
                    <strong>Leave feedback</strong>
                  </LinkContainer>
                  &nbsp; - &nbsp;
                  <a href={`mailto:` + CONFIG.email} target="_blank">
                    <strong>Media inquiries</strong>
                  </a>
                </div>
              </Col>
            </div>
          </div>
        </footer>
      </div>
    );
  }
}

export default withRouter(Footer);
