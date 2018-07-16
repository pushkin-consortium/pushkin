
module.exports = class RPCParams {
	constructor(method, data) {
		this.method = method;
		this.data = data;
	}
	getParams() {
		return {
			method: this.method,
			data: this.data
		};
	}
}
