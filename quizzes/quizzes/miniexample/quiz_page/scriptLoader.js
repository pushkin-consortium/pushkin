export default (srcUrl, onLoad) => {
	return new Promise( (resolve, reject) => {
		setTimeout(e => reject(`Loading timed out for ${srcUrl}`), 10000);

		// check if this script is already loaded
		// can't use array stuff because getElements doesn't return an array
		const scripts = document.getElementsByTagName('script');
		for (let i=0; i<scripts.length; i++) {
			if (scripts[i].src == srcUrl) {
				resolve(`already loaded ${srcUrl}`);
				return;
			}
		}

		const script = document.createElement('script');
		script.onload = () => { resolve('loaded successfully'); onLoad() };
		script.src = srcUrl;
		document.body.appendChild(script);
	});
}
