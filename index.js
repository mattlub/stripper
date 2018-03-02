const puppeteer = require('puppeteer')
const { querySelectArray, maybeFindText } = require('./utils')

const { email, pass } = require('./secrets')

const GROUP_PAGE_URL = 'https://mbasic.facebook.com/groups/228761190470008?bacr=1519989551%3A1839721619373949%3A1839721619373949%2C0%3A7%3A&multi_permalinks&refid=18'
const BASE_URL = 'https://mbasic.facebook.com'

const NUM_PAGES = 1

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

  for (let ii = 0; ii < NUM_PAGES; ii++) {
	  // wait for load
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

				// try to find the title text...
				const textClasses = ['bo', 'bp']
				let jj = 0
				let text = []
				do {
					text = maybeFindText(`.${textClasses[jj]} > p`)
					jj = jj + 1
				} while (jj < textClasses.length && !text)
				console.log('last checked title class ', textClasses[jj - 1])

				const post = {
					title: maybeFindText('h3'),
					text,
					likes: maybeFindText('.co .cs'),
					date: maybeFindText('.bq abbr') || maybeFindText('.bs abbr')
				}

				const commentsAreWrong = cx => !cx.length || !cx[0].id || cx[0].id.includes('sentence')

				// try to find the comments...
				const commentsClasses = ['cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy']
				let j = 0
				let comments = []
				do {
					comments = querySelectArray(`div.${commentsClasses[j]}`)
					j = j + 1
				} while (j < commentsClasses.length && commentsAreWrong(comments))
				console.log('last checked comment class ', commentsClasses[j - 1])

				comments = comments
					.map(c => {
						const author = maybeFindText(c, 'h3 > a')
						let contentClasses = ['cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy']
						let k = 0
						do {
							content = maybeFindText(c, `div.${contentClasses[k]}`)
							k = k + 1
						}
						while (k < contentClasses.length && (!content || content === author))
						console.log('last checked comment content class ', commentsClasses[k - 1])

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
	  	const vital = {
	  		link,
	  		title: res.post.title,
	  		text: res.post.text,
	  		commenter: res.comments[0] && res.comments[0].author,
	  		comment: res.comments[0] && res.comments[0].content
	  	}

	  	if (Object.values(vital).some(val => !val)) {
	  		console.log(vital, '\n')
	  	} else {
	  		console.log('decent scrape :)')
	  	}
	  }

	  // click the see more
	  await page.evaluate(() => {
	  	const seeMore = Array.prototype.slice.call(document.querySelectorAll('a'))
	  		.find(a => a.querySelector('span') && a.querySelector('span').textContent === 'See more posts')
	  	seeMore.click()
	  })
  // end of loop
  }

  // await page.screenshot({path: 'digg.png', fullPage: true})
  
  await browser.close()
})()
