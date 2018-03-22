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
import * as i from 'react-social-icons';
import s from './Footer.css';

class Footer extends React.Component {
  render() {
    return (
      <footer id="footer">
        <div className={s.footer}>
          <div className={s.vert}>
            <nobr>
              <span className={s.pad5}>
                <i.SocialIcon
                  network="facebook"
                  color={'#ffffff'}
                  url="https://www.facebook.com/sharer/sharer.php?u=http%3A%2F%2Fgameswithwords.org&t=GamesWithWords"
                />
              </span>
              <span className={s.pad5}>
                <i.SocialIcon
                  network="twitter"
                  color={'#ffffff'}
                  url="https://twitter.com/intent/tweet?source=http%3A%2F%2Fgameswithwords.org&text=GamesWithWords:%20http%3A%2F%2Fgameswithwords.org"
                />
              </span>
              <span className={s.pad5}>
                <i.SocialIcon
                  network="google"
                  color={'#ffffff'}
                  url="https://plus.google.com/share?url=http%3A%2F%2Fgameswithwords.org"
                />
              </span>
              <span className={s.pad5}>
                <i.SocialIcon
                  network="linkedin"
                  color={'#ffffff'}
                  url="https://www.linkedin.com/shareArticle?mini=true&url=http%3A%2F%2Fgameswithwords.org&title=GamesWithWords&summary=How%20good%20is%20your%20language%20sense%3F%20Find%20out%20by%20playing%20games%20while%20participating%20in%20cutting-edge%20research!&source=http%3A%2F%2Fgameswithwords.org"
                />
              </span>
              <span className={s.pad5}>
                <i.SocialIcon
                  network="pinterest"
                  color={'#ffffff'}
                  url="https://pinterest.com/pin/create/button/?url=http%3A%2F%2Fgameswithwords.org&media=http://archive.gameswithwords.org/images/81200164_f7d2b34226_b.jpg&description=How%20good%20is%20your%20language%20sense%3F%20Find%20out%20by%20playing%20games%20while%20participating%20in%20cutting-edge%20research!"
                />
              </span>
              <span className={s.pad5}>
                <i.SocialIcon
                  network="vk"
                  color={'#ffffff'}
                  url="https://vk.com/share.php?url=http%3A%2F%2Fwww.gameswithwords.org%2F%23sthash.ehQFkVPt.wluf&title=Games%20With%20Words&description=&image=&display=widget"
                />
              </span>
              <span className={s.pad5}>
                <i.SocialIcon
                  network="email"
                  color={'#ffffff'}
                  url="mailto:?subject=Check%20Out%20GamesWithWords&body=How%20good%20is%20your%20language%20sense%3F%20Find%20out%20by%20playing%20games%20while%20participating%20in%20cutting-edge%20research!:%20http%3A%2F%2Fgameswithwords.org"
                />
              </span>
            </nobr>
          </div>
        </div>
      </footer>
    );
  }
}

export default Footer;
