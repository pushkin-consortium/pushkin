import React from 'react';
import Header from './Header';
import Footer from './Footer';
import s from './Layout.css';

class Layout extends React.Component {
	render() {
		const { auth, showForum, isAdmin, ismobile } = this.props;

		return (
			<div>
				<Header {...( auth ? { auth: auth, isAdmin: isAdmin } : {})} showForum={showForum} ismobile={ismobile} />
					{this.props.children}
				<Footer />
			</div>
		);
	}
}

export default Layout;
