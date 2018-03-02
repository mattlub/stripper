const puppeteer = require('puppeteer')
const { querySelectArray, maybeFindText } = require('./utils')

const { email, pass } = require('./secrets')

const GROUP_PAGE_URL = 'https://mbasic.facebook.com/groups/228761190470008?bacr=1519989551%3A1839721619373949%3A1839721619373949%2C0%3A7%3A&multi_permalinks&refid=18'
const BASE_URL = 'https://mbasic.facebook.com'

const posts = []

;(async () => {
	// setup
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const detailPage = await browser.newPage()

  // start
  await page.goto(GROUP_PAGE_URL)

  //login
  const emailInput = await page.$('input[name="email"]')
  if (emailInput) {
  	console.log('logging in...')
  	await page.evaluate((email, pass) => {
  		document.querySelector('input[name="email"]').value = email
      document.querySelector('input[name="pass"]').value = pass
      // German lol
      document.querySelector('input[value="Anmelden"]').click()
  	}, email, pass)
  }

  // wait for login
  await page.waitFor(3000)

  // take the links off the page
  let storyLinks
  storyLinks = await page.evaluate(() => {
		const arr = Array.prototype.slice.call(document.querySelectorAll('a'))
		return arr
			.filter(a => a.textContent === 'Full Story')
			.map(a => a.href)
	})

  // log all the posts
  for (let i = 0; i < storyLinks.length; i++) {
  	const link = storyLinks[i]
  	// console.log(link)
  	// console.log(link)
  	await detailPage.goto(link)
  	await detailPage.screenshot({path: 'example.png'})
  	const res = await detailPage.evaluate(() => {
  		const querySelectArray = selector => Array.prototype.slice.call(document.querySelectorAll(selector))
  		const maybeFindText = function(inside, selector) {
				const [ins , sel] = arguments.length === 2 
					? [inside, selector]
					: [document, inside]
				return ins.querySelector(sel) && ins.querySelector(sel).textContent
			}
			const post = {
				title: maybeFindText('h3'),
				text: maybeFindText('.bp > p'),
				likes: maybeFindText('.co .cs'),
				date: maybeFindText('.bq abbr') || maybeFindText('.bs abbr')
			}

			// try to find the comments...
			const commentsClasses = ['ct', 'cq', 'co']
			let j = 0
			let comments = []
			do {
				comments = querySelectArray(`div.${commentsClasses[j]}`)
				j = j + 1
			} while (j < commentsClasses.length && comments.length && !comments[0].id)

			comments = comments
				.map(c => {
					const author = maybeFindText(c, 'h3 > a')
					let content = maybeFindText(c, '.cv')
					if (content === author || content === null) content = maybeFindText(c, '.cw')
					return {
						author,
						content,
						likes: maybeFindText(c, '.cx .db')
					}
				})
				.filter(c => !(c.author === null && c.content === null))
			
			return {
				post, comments
			}
  	})
  	// log 
  	// console.log(res.post, res.comments.slice(0, 2))
  }

  // click the next button
  // const seeMoreLink = querySelectArray('a').find(a => maybeFindText(a, 'span') === 'See more posts')

  // repeat :D
  	
  await browser.close()
})()

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