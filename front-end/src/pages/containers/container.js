import React from 'react';
import Layout from '../../components/Layout/Layout'; // eslint-disable-line
import isMobile from '../../core/ismobile.js';
import { connect } from 'react-redux';
import s from './container.scss';

class Container extends React.Component {
	constructor() {
		super();
		this.updateMobile = this.updateMobile.bind(this);
		this.state = { ismobile: isMobile() };
	}
	componentDidMount() {
		window.addEventListener('resize', this.updateMobile);
	}
	componentWillUnmount() {
		window.removeEventListener('resize', this.updateMobile);
	}
	updateMobile() { this.setState({ mobile: isMobile() }); }

	render() {
		const { auth, showForum } = this.props;
		const isAdmin =
			this.props.userInfo &&
			this.props.userInfo.profile &&
			this.props.userInfo.profile.groups &&
			this.props.userInfo.profile.groups.indexOf('Admin') > -1;

		return (
			<Layout
				auth={auth}
				isAdmin={isAdmin}
				showForum={showForum}
				ismobile={this.state.ismobile}
			>
				<div className={s.wrap}>
					{this.props.children}
				</div>
			</Layout>
		);
	}
}
export default connect(state => state)(Container);
