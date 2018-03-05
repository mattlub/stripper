const MongoClient = require('mongodb').MongoClient
const DB_URL = 'mongodb://localhost:27017/stripper'
const { promisify } = require('util')
const connect = promisify(MongoClient.connect)

;(async () => {
	const client = await connect(DB_URL)
	const db = client.db('stripper');
	console.log("Connected successfully to db");

	const posts = await db.collection('posts')
	// await posts.insert({test: 'string'})
	// console.log('success')

	const searchText = '"you should search it with any questions"'

	const results = await posts.find({ $text: { $search: searchText } }).toArray()

	// db.posts.createIndex({ "text":"text", "comments.content":"text" })

	// const all = await posts.find({}).toArray()
	console.log(results)

	client.close()
})()
