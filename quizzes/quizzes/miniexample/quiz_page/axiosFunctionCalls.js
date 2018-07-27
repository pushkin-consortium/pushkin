import localAxios from "../axiosConfigInitial"


export const recordData = (user_id, data) => {
	console.log(`recordData: ${user_id}, ${data}`);
	return;
	const postData = {
		user_id: user_id,
		data_string: data
	};
	localAxios.post('/stimulusResponse', postData)
		.then(r => console.log('recordData: success'))
		.catch(console.log);
};
