import React from "react";
import { connect } from "react-redux";

import DashboardNav from "../../components/DashboardNav/index";
import s from "./styles.css";
import DashboardForum from "../../components/DashboardForum/index";
import DashboardProfile from "../../components/DashboardProfile/index";
import baseUrl from "../../core/baseUrl";
import localAxios from "../../actions/localAxios";
import BadgeHolder from "../../components/LeaderBoardComponents/BadgeHolder";
import Container from '../containers/container';
import {
	checkLogin,
	login,
	logout,
	isAuthenticated,
	getUserInfo,
	updateUser,
	resetPassword,
	loginLocation
} from "../../actions/userinfo";
import { getUserPostIds } from "../../actions/forum";

const QUIZ_NAMES = ["bloodmagic"];

class Dashboard extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			profile: null,
			section: null,
			badgeData: []
		};
		this.dispatchCheckLogin();
	};

	dispatchCheckLogin() {
		this.props.dispatch(loginLocation("/dashboard"));
		this.props.dispatch(checkLogin());
	};

	logout() { this.props.dispatch(logout()); };

	resetPassword(email) {
		this.props.dispatch(resetPassword(email));
	};

	updateUser(payload, userId) {
		this.props.dispatch(updateUser(payload, userId));
	};

	fetchUserId(quiz_name) {
		return localAxios
			.post(`/${quiz_name}/createUser`, {
				auth0_id: this.props.userInfo.profile.user_id
			})
			.then(({ data: { id } }) => {
				return { quiz_name, id };
			});
	};

	fetchResponseCount({ quiz_name, id }) {
		return localAxios
			.get(`/${quiz_name}/questionsAnswered`, {
				params: {
					user_id: id
				}
			})
			.then(({ data: { count } }) => ({ quiz_name, count }));
	};

	componentDidUpdate() {
		if (this.state.badgeData.length < 1) {
			if (this.props.userInfo.profile) {
				Promise.all(QUIZ_NAMES.map(this.fetchUserId))
					.then(arr => Promise.all(arr.map(this.fetchResponseCount)))
					.then(data => {
						this.setState({ badgeData: data });
					});
			}
		}
	}

	componentWillMount() {
		this.showProfile();
	}
	componentWillReceiveProps(nextProps) {
		if (nextProps.userInfo.profile) {
			this.setState({ profile: nextProps.userInfo.profile });
		}
	}

	showProfile = () => {
		if (isAuthenticated() && !this.props.userInfo.profile) {
			this.props.dispatch(getUserInfo());
		}
	};

	updateLocalProfile = metaData => {
		let profile = {
			...this.state.profile,
			user_metadata: metaData
		};
		this.setState({ profile });
	};

	setSection = section => {
		this.setState({ section });
	};

	getUserPosts = user => {
		this.props.dispatch(getUserPostIds(user));
	};

	showContent = () => {
		const { profile } = this.state;
		switch (this.state.section) {
			case "profile":
				return (
					<DashboardProfile
						profile={profile.user_metadata}
						userId={profile.user_id}
						email={profile.email}
						logout={this.logout}
						resetPassword={this.resetPassword}
						updateUser={this.updateUser}
						showProfile={this.showProfile}
						updateLocalProfile={this.updateLocalProfile}
					/>
				);
			case "subscriptions":
				return <div>Subscriptions Coming soon ... </div>;
			case "forum":
				return (
					<DashboardForum
						getUserPostIds={this.getUserPosts}
						user={this.props.userInfo.profile.user_id}
						baseUrl={baseUrl}
						posts={this.props.userPosts}
					/>
				);
			default:
				return (
					<DashboardProfile
						profile={this.props.userInfo.profile.user_metadata}
						userId={this.props.userInfo.profile.user_id}
						email={this.props.userInfo.profile.email}
						logout={this.logout}
						resetPassword={this.resetPassword}
						updateUser={this.updateUser}
						showProfile={this.showProfile}
						updateLocalProfile={this.updateLocalProfile}
					/>
				);
		}
	};

	render() {
		const authenticated = isAuthenticated();
		const { profile } = this.props.userInfo;

		if (!authenticated) {
			return (
				<Container {...this.props}>
				<div>
					<p>Please <a onClick={login}>Log In</a> to view your dashboard.</p>
				</div>
			</Container>
			);
		}
		if (!profile) return (<h1>Error</h1>);
		return (
			<Container {...this.props}>
				<div>
					<div>
						<DashboardNav
							setSection={this.setSection}
							logOut={this.logout}
							config={this.props.config}
						/>
					</div>
					<div>{this.showContent()}</div>
					<div>
						{this.state.badgeData.map(data => (
							<BadgeHolder name={data.quiz_name} count={data.count} />
						))}
					</div>
				</div>
		</Container>
		);
	}

}

function mapStateToProps(state, ownProps) {
	let userPosts = [];
	if (state.userInfo.profile) {
		const auth0_id = state.userInfo.profile.user_id;
		const filterer = post => post.auth0_id == auth0_id;
		userPosts = state.forum.posts.filter(filterer);
	}
	return { ...state, userPosts };
}

export default connect(mapStateToProps)(Dashboard);
