# @pushkin-templates/site-basic

The basic template provides everything you need for building a bare-bones Pushkin site. It does not include authentication, forum, or dashboard features.

## Installing the site-basic template

Make sure you've first created a new directory in which you'll build your Pushkin site. From within your new site directory, run:

```
pushkin i site
```

Select the main Pushkin distribution and `@pushkin-templates/site-basic` from the list of available templates. Then choose which version you want (the latest is typically recommended).

## Testing

Out of the box, the basic site template supports limited integration and component testing using Jest. Before running tests, you must first install at least one experiment and run `pushkin prep`. You can then run the included tests with the command `yarn test` from the root of your site.

 Note that you must run `pushkin prep` before running tests in order for new experiments and/or changes to existing experiments to be picked up by the tests.

To learn more about how Pushkin uses Jest, please see the relevant documentation [here](../developers/testing.md).

### Integration Tests 

Pushkin now supports integration testing for experiments. These tests function by using the user's actual experiments from the `experiments.js` file. They attempt to render experiments and validate their functionality. 

#### QuizTile.test.js
- **Renders QuizTile for each experiment**: Ensures the component renders correctly without crashing for each experiment.
- **Mocks window.open on social icon click**: Verifies that clicking a social icon triggers the `window.open` function.
- **Checks navigation on card image click**: Confirms that clicking the card image navigates to the quiz details.

#### TakeQuiz.test.js
- **Renders quiz component for each experiment**: Ensures the quiz component renders correctly for each experiment, with necessary async operations handled.

### Component Tests

These tests validate that frontend components unrelated to actual experiments are working correctly. They primarily test rendering, styles, and validate that relevant attributes are in the correct place. 

#### FindingsCard.test.js
- **Renders correctly with mandatory props**: Ensures all expected attributes are present without the "Read more" link.
- **Renders "Read more" link when `link` prop is true**: Verifies the presence of the link when the `link` prop is set to true.

#### Header.test.js
- **Renders navigation links correctly**: Checks that navigation links ("Quizzes," "Findings," "About") are present in the document.
- **Renders the navbar toggle for mobile view**: Ensures the navbar toggle button is available for mobile view.

#### TeamMember.test.js
- **Renders the team member card with all props correctly**: Validates that the image, name, and description are rendered correctly.
- **Ensures critical styles are applied**: Confirms that the correct background color is applied to the card.
- **Verifies structural integrity**: Checks that the name and description are present in the document.