import { NEXT_PAGE, PROGRESS_PRECENT } from '../actions/nextPage';

export default function nextpage(
  state = {
    page: 1,
    precent: -5.45,
    content:
      "Is Throw me down the stairs my shoes a good English sentence? The answer depends on where you live. Many people in Newfoundland find that sentence perfectly grammatical. By taking this quiz, you will be helping train a machine algorithm that is mapping out the differences in English grammar around the world, both in traditionally English-speaking countries and also in countries like Mexico, China, and India. At the end, you can see our algorithm's best guess as to which English you speak as well as whether your first (native) language is English or something else."
  },
  action
) {
  switch (action.type) {
    case NEXT_PAGE: {
      return {
        ...state,
        page: action.pageInfo.page,
        content: action.pageInfo.content
      };
    }
    case PROGRESS_PRECENT: {
      return {
        ...state,
        precent: action.precent
      };
    }
    default:
      return state;
  }
}
