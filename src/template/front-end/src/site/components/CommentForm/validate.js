const validate = values => {
  const errors = {};
  if (!values.primaryLanguages || values.primaryLanguages.length === 0) {
    errors.primaryLanguages = 'Required';
  }
  if (!values.nativeLanguages || values.nativeLanguages.length === 0) {
    errors.nativeLanguages = 'Required';
  }
  if (!values.learnAge) {
    errors.learnAge = 'Required';
  }
  if (!values.countriesOfResidence) {
    errors.countriesOfResidence = 'Required';
  }
  return errors;
};

export default validate;
