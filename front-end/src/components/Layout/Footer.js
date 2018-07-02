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
import s from './Footer.scss';

class Footer extends React.Component {
	render() {
		return (
			<footer>
				<div className={s.footer}>
					<div className={s.vert}>
						<nobr>
							<span className={s.pad5}>
								<i.SocialIcon network="facebook" color={'#ffffff'} url="" />
							</span>
							<span className={s.pad5}>
								<i.SocialIcon network="twitter" color={'#ffffff'} url="" />
							</span>
							<span className={s.pad5}>
								<i.SocialIcon network="google" color={'#ffffff'} url="" />
							</span>
							<span className={s.pad5}>
								<i.SocialIcon network="linkedin" color={'#ffffff'} url="" />
							</span>
							<span className={s.pad5}>
								<i.SocialIcon network="pinterest" color={'#ffffff'} url="" />
							</span>
							<span className={s.pad5}>
								<i.SocialIcon network="vk" color={'#ffffff'} url="" />
							</span>
							<span className={s.pad5}>
								<i.SocialIcon network="email" color={'#ffffff'} url="" />
							</span>
						</nobr>
					</div>
				</div>
			</footer>
		);
	}
}

export default Footer;
