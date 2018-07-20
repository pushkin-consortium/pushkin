import axios from "../axiosConfigInitial"

// This function is not related to timeline data. It shouldn't be in this file.
//
// Function needed for saving data through an Axios call to an API endpoint.

const recordData = function(data){

	return axios
		  .post('/stimulusResponse', {
			  user_id: user,
			  data_string: toSend,
		  })
		  .then(function(res) {
			  self.props.dispatchTempResponse({
			  user_id: user,
			  data_string: toSend,
			  });
			})
	
  }

const explain_study = {
	type: 'instructions',
	pages:["<p align='left'> This vocabulary test was designed by researchers at Boston College. </p><p align='left'> When you finish, you will see how well you did compared to other people of a similar age and educational background. </p><p align='left'> We are studying how people's vocabularies are affected by things like age, birth order, and when you started learning English. </p><p align='left'> We also hope the quiz is fun and informative. Thank you for your participation! </p>"],
	show_clickable_nav: true,
	button_label_next:'Continue',
	on_finish: function(data){
		recordData(data)
	}
};

const consent = {
	type: 'instructions',
	pages: ["<p align='left'> This experiment is being conducted by researchers at Boston College. Please read this consent statement carefully before deciding whether to participate.</p><p align='left'> <strong>About the research:</strong> This experiment examines people's knowledge of English vocabulary. We are interested in how this is affected by demographic variables like age, birth order, and the age at which you began learning English. </p><p align='left'><strong> Risks and Benefits:</strong> This research has no known risks. We will explain the purpose of the experiment at the end of the experiment, along with any potential implications of the research. To receive copies of journal articles or research summaries, email gameswithwords@gmail.com. </p><p align='left'> <strong>Confidentiality:</strong> Study participation is anonymous and confidential. We do not ask or store your identity. </p><p align='left'> <strong>Participation and Withdrawal:</strong> Your participation in this study is completely voluntary, and you may quit at any time without penalty.</p><p align='left'> <strong>Review:</strong> This study has been approved by the Massachusetts Institute of Technology institutional review board. </p><p align='left'><strong> Agreement: </strong>By pressing any key to continue, I indicate that this research have been sufficiently explained and I agree to participate in this study. </p>"],
	show_clickable_nav: true,
	button_label_next:'Continue',
	on_finish: function(data){
		recordData(data)
	}
};

const intro = {
	type: 'instructions',
	pages: [" <p align='left'> A sample paragraph written in HTML! </p>"],
	show_clickable_nav: true,
	button_label_next:'Continue',
	on_finish: function(data){
		recordData(data)
	}
};

	
const timeline = [demographics, consent, intro];

export default timeline;
