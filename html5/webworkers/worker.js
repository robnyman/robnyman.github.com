onmessage = function (evt) {
	for (var i=evt.data, il=1000001; i<il; i++) {
		postMessage(i);
	};
};