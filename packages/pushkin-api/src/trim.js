export default (s, maxL) => s.length <= maxL ? s : `${s.substring(0, maxL)}...`;
