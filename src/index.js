import Axios from 'axios';

export default class Pushkin {
	constructor() {
		this.con = undefined;
	}

	connect(quizAPIUrl) {
		this.con = Axios.create({
			baseURL: quizAPIUrl
		});
	}

	loadScript(url) {
		return new Promise( (resolve, reject) => {
			const timeout = setTimeout(() => reject(`Loading timed out for ${url}`), 5000);

			// check if this script is already loaded and reload if it is
			// can't use array 'has' because getElements doesn't return an array
			const scripts = document.getElementsByTagName('script');
			for (let i=0; i<scripts.length; i++) {
				if (scripts[i].src == url)
					scripts[i].parentNode.removeChild(scripts[i]);
			}

			const script = document.createElement('script');
			script.onload = () => {
				clearTimeout(timeout);
				resolve(script);
			};
			script.src = url;
			document.body.appendChild(script);
		});

	}

	loadScripts(urls) { return Promise.all(urls.map(this.loadScript)); }

	prepExperimentRun(userID) {
		const postData = {
			user_id: userID
		} 
		return this.con.post('/startExperiment', postData); 
	}

	getAllStimuli(userID) {
		const postData = {
			user_id: userID
		} 
		return this.con.post('/getStimuli', postData)
			.then(res => {
				const stimuli = res.data.resData;
				return stimuli.map(s => JSON.parse(s.stimulus));
			});
	}

	setSaveAfterEachStimulus(stimuli) {
		return stimuli.map(s => ({
			...s,
			on_finish: this.saveStimulusResponse.bind(this)
		}));
	}

	saveStimulusResponse(data) {
		// Because we are saving data, it should be coming with a userID already
		// Might make sense at some point to confirm this is what we expect
		const postData = {
			user_id: data.user_id,
			data_string: data
		};
		return this.con.post('/stimulusResponse', postData);
	}

	endExperiment(userID) { 
		const postData = {
			user_id: userID
		} 
		return this.con.post('/endExperiment', postData); 
	}

	customApiCall(path, data, httpMethod) {
		httpMethod = httpMethod || 'post';
		return new Promise((resolve, reject) => {
			this.con[httpMethod](path, data)
				.then(response => {
					// parse it if it's JSON, leave it otherwise
					try { response = JSON.parse(response); }
					catch (e) { }
					const resData = response.data && response.data.resData ? response.data.resData : null;
					resolve(resData);
				})
				.catch(err => {
					reject(err);
				});
		});
	}
}






