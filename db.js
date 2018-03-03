var MongoClient = require( 'mongodb' ).MongoClient
const DB_URL = 'mongodb://localhost:27017/stripper'

let _db

module.exports = {

  connect: function(callback) {
    MongoClient.connect( DB_URL, function( err, db ) {
      _db = db
      return callback( err )
    } )
  },

  getDb: function() {
    return _db
  }
}