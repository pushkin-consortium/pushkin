/* eslint-disable no-unused-vars */
import React from 'react';
import * as b from 'react-bootstrap';
import s from './Header.scss';
import { Link } from 'react-router';
import { LinkContainer } from 'react-router-bootstrap';
/* eslint-enable */

class Header extends React.Component {
	home() {
		if (window.location.pathname.toString().split('/')[1] === '') {
			return true;
		} else {
			return false;
		}
	}

	render() {
		const { auth, showForum, isAdmin, ismobile } = this.props;
		let loggedIn = auth ? auth.isAuthenticated() : false;
		console.log(`Header: render: ismobile: ${ismobile}`);

		if (this.home()) {
			return (
				<header>
					<Link to="/quizzes">
						<div className={s.landing}>
							<p>Splash Screen</p>
						</div>
					</Link>
				</header>
			);
		}
		if (ismobile) {
			return (
				<header ref={node => (this.root = node)}>
					<b.Nav bsStyle="pills">
						<b.NavDropdown active title="Menu">
							<LinkContainer to="/about">
								<b.MenuItem>
									<span>About</span>
								</b.MenuItem>
							</LinkContainer>

							<LinkContainer to="/quizzes">
								<b.MenuItem>
									<span>Quizzes</span>
								</b.MenuItem>
							</LinkContainer>

							<LinkContainer to='/dashboard'>
								<b.MenuItem>
									<span>{ loggedIn ? 'Dashboard' : 'Log In' }</span>
								</b.MenuItem>
							</LinkContainer>

							{showForum && (
								<LinkContainer to="/forum">
									<b.MenuItem>
										<span>Forum</span>
									</b.MenuItem>
								</LinkContainer>
							)}

							{isAdmin && (
								<LinkContainer to="/admin">
									<b.MenuItem>
										<span>Admin</span>
									</b.MenuItem>
								</LinkContainer>
							)}
						</b.NavDropdown>
					</b.Nav>
				</header>
			);
		}
		// desktop
		return (
			<header ref={node => (this.root = node)} >
				<b.Navbar>
					<b.Nav bsStyle="tabs" justified >
						<LinkContainer to="/about">
							<b.NavItem>About</b.NavItem>
						</LinkContainer>

						<LinkContainer to="/quizzes">
							<b.NavItem>Quizzes</b.NavItem>
						</LinkContainer>

						<LinkContainer to="/dashboard">
							<b.NavItem>{ loggedIn ? 'Dashboard' : 'Log In' }</b.NavItem>
						</LinkContainer>

						{showForum && (
							<LinkContainer to="/forum">
								<b.NavItem>Forum</b.NavItem>
							</LinkContainer>
						)}

						{isAdmin && (
							<LinkContainer to="/admin">
								<b.NavItem>Admin</b.NavItem>
							</LinkContainer>
						)}
					</b.Nav>
				</b.Navbar>
			</header>
		);
	}
}

export default Header;
