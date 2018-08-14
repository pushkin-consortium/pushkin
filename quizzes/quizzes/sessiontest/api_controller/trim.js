const trim = (s, maxL) => s.length <= maxL ? s : `${s.substring(0, maxL)}...`;

module.exports = { trim }
