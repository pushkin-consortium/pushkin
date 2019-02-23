import {
	CREATE_POST,
	FETCH_ALL_POSTS,
	FETCH_ONE_POST,
	FETCHING,
	SEARCH_RESULTS,
	SEARCH_TERM,
	CLEAR_SEARCH,
	RECEIVE_COMMENTS,
	REMOVE_COMMENT,
	REMOVE_POST
} from '../actions/forum';
import { flatten } from 'lodash';

const initialState = {
	fetching: false,
	posts: [],
	term: '',
	results: null,
	comments: []
};
export default function forum(state = initialState, action) {
	switch (action.type) {
		case CLEAR_SEARCH: {
			return {
				...state,
				term: '',
				results: null
			};
		}
		case SEARCH_RESULTS: {
			return {
				...state,
				results: flatten(
					Object.keys(action.results).map(key => {
						return action.results[key].map(obj => {
							obj.type = key.replace(/s$/i, '');
							return obj;
						});
					})
				)
			};
		}
		case SEARCH_TERM:
			return {
				...state,
				term: action.term
			};
		case CREATE_POST: {
			return {
				...state,
				post: action.post
			};
		}
		case FETCH_ALL_POSTS: {
			return {
				...state,
				fetching: false,
				posts: action.data
			};
		}
		case FETCH_ONE_POST: {
			return {
				...state,
				fetching: false,
				post: action.post
			};
		}
		case FETCHING: {
			return {
				...state,
				fetching: true
			};
		}
		case RECEIVE_COMMENTS:
			return {
				...state,
				comments: action.comments
			};
		case REMOVE_POST:
			return {
				...state,
				posts: state.posts.filter(comment => comment.id != action.id)
			}

		case REMOVE_COMMENT:
			return {
				...state,
				comments: state.comments.filter(comment => comment.id != action.id)
			}
		case 'UPDATE_POST':
			// find the post and update it
			let index = state.posts.findIndex(post => post.id === action.post.id);
			if(index >= 0) {
				return {
					...state,
					posts: [
						...state.posts.slice(0, index),
						{
							...state.posts[index],
							...action.post
						},
						...state.posts.slice(index + 1)
					]
				}
			} else {
				return {
					...state,
					posts: [...state.posts, action.post]
				}
			}
		default:
			return state;
	}
}
