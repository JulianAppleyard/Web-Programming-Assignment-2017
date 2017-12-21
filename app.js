/**
	A nodejs web service for events.
	Author: Julian Appleyard
Version 0.2.0
Really needs error handling
Need to return HTTP status codes
 */
var auth_token = "concertina";
var express = require('express');
var app = express();
var http = require('http');
var fs = require('fs');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));

app.get('/events2017', function(req, resp) {

	resp.writeHead(200, {'Content-Type': 'application/json'});
	resp.end('Hello world');

})
/*
app.get('/events2017/index.html', function(req, resp) {
	fs.readFile('./index.html', function(err, html){
		if(err){
			throw err;
		}

		http.createServer(function(req, resp){
			resp.writeHead(200, {"Content-Type": "text/html"});
			resp.write(html);
			resp.end();

		});
	});

	resp.sendFile(__dirname + '/index.html');
	console.log("Displaying index.html");
	resp.writeHead(200, {'Content-Type' : 'text/html'});
	resp.write()

})
*/

app.get('/events2017/admin.html', function(req, resp) {
	resp.sendFile(__dirname + '/admin.html');
	console.log("Displaying admin.html");
})

app.get('/events2017/index.html', function(req, resp){
	resp.sendFile(__dirname + '/index.html');
	console.log("Displaying index.html");
})

app.get('/events2017/style.css', function(req, resp) {
	resp.sendFile(__dirname + '/style.css');
})


/*
Work in Progress
needs better event handling
Stringify Puts spaces between properties and their values for some reason

*/
app.get('/events2017/venues', function (req, resp) {

	var outputString = '"venues":{';

	fs.readFile("./events.json", 'utf8', function(err, data){
		if(err) throw err;

		var parsedObj = JSON.parse(data);

		console.log("Length of events array: " + parsedObj.events.length);


		outer_loop:
		for(var i = 0; i < parsedObj.events.length; i++)
		{
			console.log("Checking event #" + (i+1));

			var v_id = JSON.stringify(parsedObj.events[i].venue.venue_id);

			//need to check if venue already exists in list
			for(var j = 0; j < i; j++ ){//this checks if we would have already retrieved it
				var v_jd = parsedObj.events[j].venue.venue_id;
				console.log(j);
						if(v_id === v_jd){
							continue outer_loop;
					}
			}



			vName = parsedObj.events[i].venue.name;
			vPostcode = parsedObj.events[i].venue.postcode;
			vTown = parsedObj.events[i].venue.town;
			vUrl = parsedObj.events[i].venue.url;
			vIcon = parsedObj.events[i].venue.icon;


			//constructing the JSON format for an individual venue
			var venueString = ':{"name":"' + vName + '","postcode":"' + vPostcode + '","town":"' + vTown +  '","url":"' + vUrl + '","icon":"' + vIcon + '"}';
			venueString = v_id.concat(venueString);
			//venueString = "{" + venueString + "}" ;

			if(i != 0) venueString = "," + venueString; //first venue does not have a comma in front, the rest do

		//	console.log(venueString);

			outputString = outputString + venueString;

		}
		outputString = "{" + outputString + "}}";
	//	console.log(outputString);

		var outputJSON = JSON.parse(outputString);
		var formattedOutput = JSON.stringify(outputJSON);
		console.log(formattedOutput);
		resp.end(formattedOutput);
	});
})



/*
This will display results based on text in the fields and in things such as
the icon url. This could be improved wait we are only supposed to search title

This does not handle cases in which escaped/URL-formatted characters need to be converted back.
Also error handling.


Need to output as an array of JSON events
If no search terms are provided, should return all events.
If only date is provided, should return only events which match the date
If date matches but not keyword, don't output
*/
app.get('/events2017/events/search', function (req, resp) {
	var searchQuery = "";
	var outputArray = [];
	var searchDate = "";

	searchQuery = req.query.search; //will assign value of undfined if url does not contain search query at all

	if(searchQuery !== undefined){
		var tmp = searchQuery.toLowerCase(); //convert to lowercase to ease comparison
		searchQuery = tmp;
	}

	console.log("Keyword searched: " + searchQuery);

	var timestamp = Date.parse(req.query.date) //attempts to convert input date string into a number of milliseconds
	if (isNaN(timestamp)==false){ //timestamp will be a number if a valid Date format was inputted, making isNaN(timestamp) false
		searchDate = new Date(timestamp); //convert timestamp back into a Date object
		console.log("Date searched: " + searchDate);
	}


	//search for query in json/database
	console.log("Reading events.json");

	fs.readFile("./events.json", 'utf8', function(err, events){
		if(err) throw err;

		var data = JSON.parse(events);

		if(searchQuery === "" && searchDate === ""){ //if no search terms/dates are provided, output all events
			console.log("No terms provided. Outputting all events.");
			resp.end(events);
			return;
		}

		console.log("Length of events array: " + data.events.length);

		for(var i = 0; i < data.events.length; i++) //iterate through each object in array
		{
			var stringTitle = data.events[i].title.toLowerCase(); //convert JSON object to string for comparison to query string
			var iDate = new Date(data.events[i].date);

			var dateCheck = false;
			var titleCheck = false;

			if(searchDate !== ""){ //if user inputs a date, check the date against database
				console.log("Date is defined:");
				dateCheck =	(iDate.toDateString() === searchDate.toDateString()); //assigns true if the Date(ignores time) portions match
				console.log("Date matches: " + searchDate);
			}

			console.log("Checking event #" + (i+1));

			titleCheck = (stringTitle.includes(searchQuery) && searchQuery != "");
			//is false when searchQuery is not in the title or when searchQuery is just the empty string



			if(titleCheck || dateCheck){
				console.log("Found matching event...");
				//add to output array
				outputArray.push(data.events[i]);
				console.log("Added to outputArray");
				console.log("Output length:" + outputArray.length);
			}

		}

		if(outputArray.length === 0){ //is this really the best way to do this? Seems problematic
			resp.writeHead(200, {'Content-Type': 'application/json'});
			console.log("No events match this query.");
			resp.end("No events match this query.");
			return;
		}

			var jsonString = JSON.stringify(outputArray);
			jsonString = '{"events":' + jsonString + "}";
			var tempJSONObject = JSON.parse(jsonString);
			jsonString = JSON.stringify(tempJSONObject);
			console.log("Outputting JSON string");
			resp.writeHead(200,  {'Content-Type': 'application/json'});
			resp.end(jsonString);


	});

})




/*
If user puts capital E instead of e in id, it will not return the event
*/
/*
depending on interpretation of requirements, may need to output has an array with
one event object instead of the object itself
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

				//console.log(data.events[i]);
				//convert javascript object to string in JSON format
				var jsonString = JSON.stringify(data.events[i]);

				jsonString = "{" + '"events":[' + jsonString + "]}";
				var parsedJSON = JSON.parse(jsonString);

				jsonString = JSON.stringify(parsedJSON);

				resp.writeHead(200, { 'Content-Type': 'application/json'});
				resp.end(jsonString);
				return;
			}
		}
		var errorJSON = {};
		errorJSON.error = "no such event";

		resp.writeHead(200, { 'Content-Type': 'application/json'});
		resp.end(JSON.stringify(errorJSON));
	});
})


app.post('/events2017/venues/add', function (req, resp){
	var auth_token = req.body.auth_token;
	var name = req.body.name;
	var postcode = req.body.postcode; // these are optional
	var town = req.body.town; //
	var url = req.body.url; //
	var icon = req.body.icon; //

	var newVenu = {
		"venue_id":{
			"name" : name,
			"postcode" : postcode,
			"town" : town,
			"url" : url,
			"icon" : icon
		}
	}
	fs.readFile("./venues.json", 'utf8', function (err, data) {

		var parsedJSON = JSON.parse(data);

		var notAuthorised = true;
		var notAllParameters = true;

		if(notAuthorised){ //send 403 error in case of error
				var errorJSON = {};
				errorJSON.error = "not authorised, wrong token";

				resp.writeHead(200, { 'Content-Type': 'application/json'});
				resp.end(JSON.stringify(errorJSON));
		}
		if(notAllParameters){//send 400 code in case of erro
			var errorJSON = {};
			errorJSON.error = "Venue not added. All required parameters must be provided.";

			resp.writeHead(200, { 'Content-Type': 'application/json'});
			resp.end(JSON.stringify(errorJSON));
		}
	});
})

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
