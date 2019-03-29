/* eslint-disable no-unused-vars */
import React from 'react';
import * as b from 'react-bootstrap';
import s from './Header.scss';
import { Link, NavLink } from 'react-router-dom';
// LinkContainer broken with v4 routing...
//import { LinkContainer } from 'react-router-bootstrap';
/* eslint-enable */

export default class Header extends React.Component {

	render() {
		const { auth, showForum, isAdmin, ismobile } = this.props;
		let loggedIn = auth ? auth.isAuthenticated() : false;

		const mobileHeader = (
			<header>
				<b.Nav bsStyle="pills">
					<b.NavDropdown active title="Menu">
						<NavLink to="/about">
							<b.MenuItem>
								<span>About</span>
							</b.MenuItem>
						</NavLink>

						<NavLink to="/quizzes">
							<b.MenuItem>
								<span>Quizzes</span>
							</b.MenuItem>
						</NavLink>

						<NavLink to='/dashboard'>
							<b.MenuItem>
								<span>{ loggedIn ? 'Dashboard' : 'Log In' }</span>
							</b.MenuItem>
						</NavLink>

						{showForum && (
							<NavLink to="/forum">
								<b.MenuItem>
									<span>Forum</span>
								</b.MenuItem>
							</NavLink>
						)}

						{isAdmin && (
							<NavLink to="/admin">
								<b.MenuItem>
									<span>Admin</span>
								</b.MenuItem>
							</NavLink>
						)}
					</b.NavDropdown>
				</b.Nav>
			</header>
		);

		const desktopHeader = (
			<header>
				<b.Navbar>
					<b.Nav bsStyle="tabs" justified >
						<NavLink to="/about">
							<b.NavItem>About</b.NavItem>
						</NavLink>

						<NavLink to="/quizzes">
							<b.NavItem>Quizzes</b.NavItem>
						</NavLink>

						<NavLink to="/dashboard">
							<b.NavItem>{ loggedIn ? 'Dashboard' : 'Log In' }</b.NavItem>
						</NavLink>

						{showForum && (
							<NavLink to="/forum">
								<b.NavItem>Forum</b.NavItem>
							</NavLink>
						)}

						{isAdmin && (
							<NavLink to="/admin">
								<b.NavItem>Admin</b.NavItem>
							</NavLink>
						)}
					</b.Nav>
				</b.Navbar>
			</header>
		);

		return ismobile ? mobileHeader : desktopHeader;

		/*
		 * let's make a separate landing page for this
		 *
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
		*/
	}
}
