module.exports = {
	"env": {
		"browser": true,
		"commonjs": true,
		"es6": true,
		"node": true
	},
	"extends": [
		"eslint:recommended",
		"react/recommended"
	],
	"parserOptions": {
		"ecmaFeatures": {
			"experimentalObjectRestSpread": true,
			"jsx": true
		},
		"sourceType": "module"
	},
	"plugins": [
		"react"
	],
	"rules": {
		"indent": [
			1,
			"tab"
		],
		"linebreak-style": [
			1,
			"unix"
		],
		"quotes": [
			1,
			"single"
		],
		"semi": [
			"error",
			"always"
		]
	}
};
