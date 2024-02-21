# Feedback Page

You can go to the feedback page by clicking the `HERE` button of  jumbotron in the home page or clicking the `Leave Feedback` button in the footer.

To embed a Google form into the feedback page:

1. Create your own [google form](https://www.google.com/forms/about/)
2. Go to “Form” dropdown in the spreadsheet view, and click “Embed form in a webpage”.
3. This will give you an `<iframe>` snippet to place on the site template.
4. Change the `src` attribute in `<iframe>` to your Google form link, it is located in `pushkin/front-end/src/pages/Feedback.js`

