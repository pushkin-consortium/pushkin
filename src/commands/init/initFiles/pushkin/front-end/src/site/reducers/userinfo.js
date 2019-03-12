import {
	SUBMIT_USER_INFO_BEGIN,
	SUBMIT_USER_INFO_SUCCESS,
	SUBMIT_COMMENTS_BEGIN,
	SUBMIT_COMMENTS_SUCCESS,
	USER_ID,
	LOGIN_SUCCESS,
	LOGIN_ERROR,
	LOGOUT_SUCCESS,
	LOGIN_LOCATION,
	TEMP_USER_ID,
	RECEIVED_USER_DATA
} from '../actions/userinfo';

// import {
//   SET_RESULTS
// } from '../actions/questionque';

export default function userInfo(state = { profile: null, subjectIds: {} }, action) {
	switch (action.type) {
		case SUBMIT_USER_INFO_SUCCESS: {
			return {
				...state,
				gender: action.data.gender,
				age: action.data.age,
				takenBefore: action.data.takenBefore,
				languageDisorder: action.data.languageDisorder,
				education: action.data.education,
				isFetching: false
			};
		}
		case SUBMIT_USER_INFO_BEGIN: {
			return {
				...state,
				isFetching: true
			};
		}
		case USER_ID: {
			return {
				...state,
				id: action.id,
				isFetching: false
			};
		}
		case SUBMIT_COMMENTS_BEGIN: {
			return {
				...state,
				isFetching: true
			};
		}
		case SUBMIT_COMMENTS_SUCCESS: {
			return {
				...state,
				isFetching: false,
				nativeLanguages: action.data.nativeLanguages,
				primaryLanguages: action.data.primaryLanguages
			};
		}
		case LOGIN_LOCATION: {
			return {
				...state,
				loginLocation: action.location
			};
		}
		case TEMP_USER_ID: {
			return {
				...state,
				tempUserId: action.id
			};
		}
		case LOGIN_SUCCESS: {
			const isAdmin = action.profile && action.profile.groups && action.profile.groups.indexOf("Admin") > -1 
			return {
				...state,
				profile: action.profile,
				subjectIds: {
					...state.subjectIds,
					[action.profile.quiz]: action.profile.id,
				},
				isAdmin: isAdmin
			};
		}
		case LOGIN_ERROR: {
			return {
				...state,
				error: action.error
			};
		}
		case LOGOUT_SUCCESS: {
			return {
				...state,
				profile: null,
				isAdmin: false
			};
		}
		case RECEIVED_USER_DATA: {
			return {
				...state,
				...action.data
			};
		}
		default:
			return state;
	}
}
