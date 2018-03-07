Scrapes posts from a facebook group and adds them to a MongoDb database.
Using Puppeteer.

Todo:
- click through 'see previous' or 'see more' (comments) when there are many comments, in order to collect all comments
- convert puppeteer evaluate methods to other methods to allow for error handling (which should be implemented)
- allow skipping of certain number of pages if restarting the scrape
- reliably collect likes/reactions
