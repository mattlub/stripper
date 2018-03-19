const MongoClient = require('mongodb').MongoClient
const puppeteer = require('puppeteer')
const { promisify } = require('util')

const connect = promisify(MongoClient.connect)

const DB_URL = 'mongodb://localhost:27017/stripper'
const GROUP_PAGE_URL = 'https://mbasic.facebook.com/groups/228761190470008?bacr=1519989551%3A1839721619373949%3A1839721619373949%2C0%3A7%3A&multi_permalinks&refid=18'
const BASE_URL = 'https://mbasic.facebook.com'
const NUM_PAGES = 10000
const NUM_TO_SKIP = 0

const posts = []
const tally = {
  total: 0,
  added: 0,
  updated: 0,
  matched: 0
}

;(async () => {
  const client = await connect(DB_URL)
  const db = client.db('stripper')
  const dbPosts = await db.collection('posts')
  console.log('Connected successfully to db')

  // setup
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const detailPage = await browser.newPage()

  try {
    // go to page and log in if necessary.
    await Promise.all([
      page.goto(GROUP_PAGE_URL),
      page.waitForNavigation()
    ])
    // console.log('gone to page')
    // console.log('awaited navigation')
    //login if necessary
    const emailInput = await page.$('input[name="email"]')
    if (emailInput) {
      const { email, pass } = require('./secrets')
      if (!email || !pass) {
        throw new Error('please export "email" and a "pass" variables from ./secrets.js')
      }
      console.log('logging in...')
      await page.evaluate((email, pass) => {
        document.querySelector('input[name="email"]').value = email
        document.querySelector('input[name="pass"]').value = pass
        // German lol
        // TODO: define language at the top
        document.querySelector('input[value="Anmelden"]').click()
      }, email, pass)
      console.log('logged in.')
    }
  } catch (err) {
    console.log('error loading page and logging in: ', err)
  }
  
  // TODO: change this because 
  // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pageclickselector-options
  await page.waitForNavigation()

  try {
    for (let ii =0; ii < NUM_PAGES; ii++) {
      // wait for load
      // console.log('scraping page', ii + 1)

      // currently copied from the bottom
      if (ii < NUM_TO_SKIP) {
        // click the see more button to load a new page of posts
        const seeMoreLink = await page.evaluate(() => {
          const seeMore = Array.prototype.slice.call(document.querySelectorAll('a'))
          .find(a => a.querySelector('span') && a.querySelector('span').textContent === 'See more posts')
          return seeMore.href
        })
        await Promise.all([
          page.waitForNavigation(),
          page.goto(seeMoreLink)
        ])
        console.log('skipped page number', ii)
        continue
      }

      // take the links off the page
      const storyLinks = await page.evaluate(() => {
        const arr = Array.prototype.slice.call(document.querySelectorAll('a'))
        return arr
          .filter(a => a.textContent === 'Full Story')
          .map(a => a.href)
      })

      // loop through the individual posts
      for (let i = 0; i < storyLinks.length; i++) {
        const link = storyLinks[i]
        // const link = 'https://mbasic.facebook.com/groups/228761190470008?view=permalink&id=1838622442817200&p=0&av=760465452&refid=18'
        // console.log('---------')
        await detailPage.goto(link)
        // await detailPage.screenshot({path: './example.png'})

        // try to find the post title...
        const titleHandle = await detailPage.$(`h3 a`)
        let postTitle
        if (titleHandle) {
          const innerTextHandle = await titleHandle.getProperty('innerText')
          postTitle = await innerTextHandle.jsonValue()
        }
        // if (postTitle) {
        //   console.log('found post title:', postTitle.slice(0, 20), '...')
        // } else {
        //   console.log('no post title found.')
        // }

        // try to find the post text...
        let postTextClass
        const postTextClasses = ['bo', 'bp', 'bq', 'br']
        let jj = 0
        let postText
        do {
          postTextClass = postTextClasses[jj]
          const textHandle = await detailPage.$(`.${postTextClass} > p`)
          if (textHandle) {
            const innerTextHandle = await textHandle.getProperty('innerText')
            postText = await innerTextHandle.jsonValue()
          }
          jj++
        } while (jj < postTextClasses.length && !postText)
        // if (postText) {
        //   console.log('found post text:', postText.slice(0, 20), '...')
        // } else {
        //   console.log('no post text found.')
        // }

        // try to find the comments class...
        let commentsClass
        const commentsClasses = ['cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy']
        let j = 0
        let comments = []
        do {
          commentsClass = commentsClasses[j]
          comments = await detailPage.evaluate(commentsClass => {
            return Array.prototype.slice.call(document.querySelectorAll(`div.${commentsClass}`))
              .filter(c => c.id && /^[0-9]*$/.test(c.id))
          }, commentsClass)
          j = j + 1
        } while (j < commentsClasses.length && comments.length === 0)
        // if (comments.length) {
        //   console.log('comments class found:', commentsClass)
        // } else {
        //   console.log('no comments found.')
        // }

        // find comments content class
        let commentContentClass
        let commentContentClasses = ['cn', 'co', 'cp', 'cq', 'cr', 'cs', 'ct', 'cu', 'cv', 'cw', 'cx', 'cy']
        let k = 0
        do {
          commentContentClass = commentContentClasses[k]
          content = await detailPage.evaluate((commentsClass, commentContentClass) => {
            const contentNodes =
              document.querySelectorAll(`div.${commentsClass} > div > div.${commentContentClass}`)
            return Array.prototype.slice.call(contentNodes)
              .filter(c => !c.id && c.textContent && c.textContent.length)
          }, commentsClass, commentContentClass)
          k = k + 1
        }
        while (k < commentContentClasses.length && !content.length)
        // if (content.length) {
        //   console.log('comment contents class found:', commentContentClass)
        // } else {
        //   console.log('no comment content class found.')
        // }

        // find numCommentsPages
        let numCommentPages = 1
        let seePrevLink 
        do {
          // console.log('looking for see prev link.')
          seePrevLink = await detailPage.evaluate(commentsClass => {
            const commentNodes = document.querySelectorAll(`div.${commentsClass}`)
            const seePrev = Array.prototype.slice.call(commentNodes)
              .find(c => c.id.includes('see_prev'))
            if (seePrev) {
              const link = seePrev.querySelector('a')
              return link && link.href
            }
            return null
          }, commentsClass)
  
          if (seePrevLink) {
            // console.log('found see previous link.')
            numCommentPages ++
            await Promise.all([
              detailPage.waitForNavigation(),
              detailPage.goto(seePrevLink)
            ])
          }
        } while (seePrevLink)
        // console.log('number of pages of comments:', numCommentPages)

        // find comments again now we know how many pages there are.
        let allComments = []
        for (let i = 0; i < numCommentPages; i++) {
          // find comments
          comments = await detailPage.evaluate((commentsClass, commentContentClass) => {
            const comments = Array.prototype.slice.call(document.querySelectorAll(`div.${commentsClass}`))
              .filter(c => c.id && /^[0-9]*$/.test(c.id))
            return comments.map(c => {
              const author = c.querySelector('h3 > a') && c.querySelector('h3 > a').textContent
              const contentNode = c.querySelector(`div.${commentContentClass}`)
              const content = contentNode && contentNode.textContent
              return { author, content }
            })
          }, commentsClass, commentContentClass)

          // add them to 'allComments' array
          allComments = allComments.concat(comments)
          if (i === numCommentPages - 1) {
            break
          }
          // click see next
          seeNextLink = await detailPage.evaluate(commentsClass => {
            const commentNodes = document.querySelectorAll(`div.${commentsClass}`)
            const seeNext = Array.prototype.slice.call(commentNodes)
              .find(c => c.id.includes('see_next'))
            if (seeNext) {
              const link = seeNext.querySelector('a')
              return link && link.href
            }
            return null
          }, commentsClass)
          if (seeNextLink) {
            // console.log('found see next link.', seeNextLink)
            await Promise.all([
              detailPage.waitForNavigation(),
              detailPage.goto(seeNextLink)
            ])
          } else {
            // we counted the number of pages wrong. :/
            // console.log('expected to find see next link but there is none')
            break
          }
        }
        // console.log('number of comments: ', allComments.length)

        const data = {
          title: postTitle,
          text: postText,
          comments: allComments
        }

        // see if exists already.
        const searchParams = {
          title: postTitle,
          text: postText
        }

        const res = await dbPosts.updateOne(
          searchParams,
          { $set: data },
          { upsert: true }
        )
        const { modifiedCount, upsertedCount, matchedCount } = res

        tally.total = tally.total + 1
        tally.updated = tally.updated + modifiedCount
        tally.added = tally.added + upsertedCount
        tally.matched = tally.matched + matchedCount
        // end of loop through posts on this page
      }

      // click the see more button to load a new page of posts
      const seeMoreLink = await page.evaluate(() => {
        const seeMore = Array.prototype.slice.call(document.querySelectorAll('a'))
          .find(a => a.querySelector('span') && a.querySelector('span').textContent === 'See more posts')
        return seeMore.href
      })

      await Promise.all([
        detailPage.waitForNavigation(),
        detailPage.goto(seeMoreLink)
      ])

      // end of loop through number of pages
      console.log(`page number ${ii + 1} completed.`)
      console.log(`${tally.total} in total, ${tally.added} added, ${tally.updated} updated, ${tally.matched} matched.`)
      console.log('\n ******************* \n')
     }
  } catch (err) {
    console.log(err)
    await page.screenshot({path: 'error.png', fullPage: true})
  }
  // close db connection
  client.close()

  await browser.close()
})()
