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
import s from './styles.css';
import Container from '../containers/container';

class HomePage extends React.Component {
	render() {
		return (
			<Container auth={this.props.auth} showForum={this.props.forum}>
				<div>
					<p>Home page</p>
				</div>
			</Container>
		);
	}
}

export default HomePage;
