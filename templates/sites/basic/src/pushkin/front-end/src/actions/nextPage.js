export const NEXT_PAGE = 'NEXT_PAGE';
export const PROGRESS_PRECENT = 'PROGRESS_PRECENT';

export function nextPage(pageInfo) {
  return {
    type: NEXT_PAGE,
    pageInfo
  };
}

export function progressPrecent(precent) {
  return {
    type: PROGRESS_PRECENT,
    precent
  };
}
