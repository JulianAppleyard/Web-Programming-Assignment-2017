/**
 * A nodejs web service for events.
 Author: Julian Appleyard

 */

var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.get('/events2017', function(req, resp) {
	resp.end('Hello world');

})

app.get('/events2017/index.html', function(req, resp) {
	resp.sendFile(__dirname + '/index.html');
	console.log("Displaying index.html");
});

app.get('/events2017/admin.html', function(req, resp) {
	resp.sendFile(__dirname + '/admin.html');
	console.log("Displaying admin.html");
})

/*
app.get('/events2017/venues', function (req, resp) {
	fs.readFile("./venues.json", 'utf8', function(err, data){
		if(err) throw err;
		console.log(data);
		//resp.send(data);
		resp.end(data);
	});
})

*/



/*
This will display results based on text in the fields and in things such as
the icon url. This could be improved
This does not handle cases in which escaped/URL-formatted characters need to be converted back.
*/
app.get('/events2017/events/search', function (req, resp) {
	var searchQuery = req.query.search;
	if(searchQuery != undefined) searchQuery = searchQuery.toLowerCase(); //convert to lowercase to ease comparison
	if(req.query.date != undefined){
	var searchDate = new Date(req.query.date);
	console.log(searchDate);
}
	//search for query in json/database
	console.log("Reading events.json");

	var outputArray = [];
	fs.readFile("./events.json", 'utf8', function(err, events){
		if(err) throw err;

		var data = JSON.parse(events);

		console.log("Length of events array: " + data.events.length);

		for(var i = 0; i < data.events.length; i++) //iterate through each object in array
		{

			console.log("Checking event #" + (i+1));
			var stringOfJSON = JSON.stringify(data.events[i]).toLowerCase(); //convert JSON object to string for comparison to query string
			var iDate = new Date(data.events[i].date);
			if(stringOfJSON.includes(searchQuery) || iDate.toDateString() === searchDate.toDateString()){
				console.log("Found matching event...")
				//add to output array
				outputArray.push(data.events[i]);
				console.log("Added to outputArray");
				console.log("Output length:" + outputArray.length);
			}

		}
		if(outputArray.length === 0){
			resp.end("No events match this query.");
		}
			var jsonString = JSON.stringify(outputArray, null, "\f");
			resp.end(jsonString);

	});

})
/*
If user puts capital E instead of e in id, it will not return the event
*/
app.get('/events2017/events/get/:event_id', function (req, resp) {
	var search_id = req.params.event_id;
	console.log("Reading events.json");
	fs.readFile("./events.json", 'utf8', function(err, events){
		if(err) throw err;
		var data = JSON.parse(events);
		//console.log(data);
		console.log("Length of events array: " + data.events.length);

		for(var i = 0; i < data.events.length; i++)
		{
			console.log("Checking event #" + i);

			if(data.events[i].event_id === search_id){ //iterate through events to find matching id

				console.log(data.events[i]);
				//convert javascript object to string in JSON format
				var jsonString = JSON.stringify(data.events[i], null, "\f" );
/*
depending on interpretation of requirements, may need to output has an array with
one event object instead of the object itself
*/
				resp.end(jsonString);
			}
		}
		resp.end("error: no such event");
	});
})

/*
app.post('/events2017/venues/add', function (req, resp){
	var auth_token = req.body.auth_token;
	var name = req.body.name;
	var postcode = req.body.postcode; // these are optional
	var town = req.body.town; //
	var url = req.body.url; //
	var icon = req.body.icon; //


	req.params.name
	fs.readFile("/"+ "venues.json", 'utf8', function (err, data) {
		})
})
*/

/*
app.post('/events2017/events/add', function (req, resp){
	var auth_token = req.body.auth_token;
	var event_id = req.body.event_id;
	var title = req.body.title;
	var venue_id = req.body.venue_id;
	var date = req.body.date;
	var url = req.body.url; //optional
	var blurb = req.body.blurb; //optional
})
*/
app.listen(8090, "127.0.0.1");
console.log('Server is listening at 127.0.0.1:8090');
