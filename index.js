const  strip = html => {
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

const list = 'https://mbasic.facebook.com/groups/228761190470008?bacr=1519989551%3A1839721619373949%3A1839721619373949%2C0%3A7%3A&multi_permalinks&refid=18'
// inside list page

// click on link then on post page
// const post = 'https://mbasic.facebook.com/groups/228761190470008?view=permalink&id=1824318674247577&refid=18&_ft_=qid.6528433365093225040%3Amf_story_key.1824318674247577%3Atop_level_post_id.1824318674247577%3Atl_objid.1824318674247577%3Asrc.22&__tn__=%2AW-R'

const scrapeListPage = () => {
	const storyLinks = querySelectArray('a').filter(a => a.textContent === 'Full Story')
	const seeMoreLink = querySelectArray('a').find(a => maybeFindText(a, 'span') === 'See more posts')
	// loop through the links
	// click the link
	seeMoreLink.click()
}

const scrapePostPage = () => {

	const post = {
		title: maybeFindText('h3'),
		text: maybeFindText('.bp > p'),
		likes: maybeFindText('.co .cs'),
		date: maybeFindText('.bq abbr')
	}

	const comments =
		querySelectArray('div.ct')
		.map(c => ({
			author: maybeFindText('h3 > a'),
			content: maybeFindText('.cv'),
			likes: maybeFindText('.cx .db')
		}))
	
	return {
		post, comments
	}
}