const strip = html => {
	var doc = new DOMParser().parseFromString(html, 'text/html')
	return doc.body.textContent || ""
}

const querySelectArray = selector => Array.prototype.slice.call(document.querySelectorAll(selector))

const maybeFindText = function(inside, selector) {
	const [ins , sel] = arguments.length === 2 
		? [inside, selector]
		: [document, inside]
	return ins.querySelector(sel) && ins.querySelector(sel).textContent
}

module.exports = {
	strip, querySelectArray, maybeFindText
}