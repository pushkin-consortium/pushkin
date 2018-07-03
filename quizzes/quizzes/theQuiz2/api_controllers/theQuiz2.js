const express = require('express');

module.exports = (rpc, conn, dbWrite) => {
	const router = new express.Router();
	router.get('/', (req, res, next) => {
		res.send('example');
	});
	return router;
}
