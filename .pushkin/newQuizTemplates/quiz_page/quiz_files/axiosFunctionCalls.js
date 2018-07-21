import axios from "../axiosConfigInitial"


const axiosMethods = {

 recordData: function(data){

	return axios
		  .post('/stimulusResponse', {
			  user_id: user,
			  data_string: data,
		  })
		  .then(function(res) {
			  self.props.dispatchTempResponse({
			  user_id: user,
			  data_string: data,
			  });
			})
	
  },

}

export default axiosMethods
