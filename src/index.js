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

	prepExperimentRun() { return this.con.post('/startExperiment'); }

	getAllStimuli() {
		return this.con.post('/getStimuli')
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
		const postData = {
			user_id: data.user_id,
			data_string: data
		};
		return this.con.post('/stimulusResponse', postData);
	}

	endExperiment() { return this.con.post('/endExperiment'); }
}
