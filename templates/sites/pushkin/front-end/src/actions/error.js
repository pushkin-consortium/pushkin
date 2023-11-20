export const ERROR = 'ERROR';

export function error(err) {
  return {
    type: ERROR,
    err
  };
}
