/**
	A nodejs web service for searching and adding events and venues using expressjs
	Author: Julian Appleyard
* Version 0.4.3
POST requests now make GET reuqests to authentication service

* TO DO
// Should I look at better error handling?
// Is this returning HTTP status codes whenever possible?
// Make a 404 page that badly formatted url requests are forwarded to

 **/


var express = require('express');
var app = express();

var request = require('request');
var http = require('http');
var fs = require('fs');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));


var auth_token = "concertina";

//Make this have links to login page and index.html
app.get('/events2017', function(req, resp) {

	resp.writeHead(200, {'Content-Type': 'application/json'});
	resp.end('Hello world');

})


// Handling GET requests of web pages
//
app.get('/events2017/admin.html', function(req, resp) {
	resp.sendFile(__dirname + '/admin.html');
	console.log("Displaying admin.html");
});

app.get('/events2017/index.html', function(req, resp){
	resp.sendFile(__dirname + '/index.html');
	console.log("Displaying index.html");
});

app.get('/events2017/style.css', function(req, resp) {
	resp.sendFile(__dirname + '/style.css');
});


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
});



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

	searchQuery = req.query.search; //will assign value of undefined if url does not contain search query at all

	if(searchQuery === undefined){
		searchQuery = "";
	}
	else{
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



			if((searchQuery === "" && dateCheck) || titleCheck){
				console.log("Found matching event...");
				//add to output array
				outputArray.push(data.events[i]);
				console.log("Added to outputArray");
				console.log("Output length:" + outputArray.length);
			}

		}

		if(outputArray.length === 0){ //is this really the best way to do this? Seems problematic
			resp.writeHead(200, {'Content-Type': 'application/json'});
			console.log("no events match this query.");
			var errorJSON = {};
			errorJSON.error = "no such event";
			resp.end(JSON.stringify(errorJSON));
			return;
		}

			var jsonString = JSON.stringify(outputArray);
			jsonString = '{"events":' + jsonString + "}";
			var tempJSONObject = JSON.parse(jsonString);
			jsonString = JSON.stringify(tempJSONObject);
			console.log("Outputting JSON string");
			resp.writeHead(200,  {'Content-Type': 'application/json'});
			resp.end(jsonString);
			return;


	});

});




/*
If user puts capital E instead of e in id, it will not return the event
*/
/*
depending on interpretation of requirements, may need to output has an array with
one event object instead of the object itself
*/
app.get('/events2017/events/get/:event_id', function (req, resp) {
	var search_id = req.params.event_id;

	if(!search_id){
		var errorJSON = {};
		errorJSON.error = "no such event";
		resp.writeHead(400, { 'Content-Type' : 'application/json'});
		resp.end(JSON.stringify(errorJSON));
	}

	console.log("Reading events.json");
	fs.readFile("./events.json", 'utf8', function(err, events){
		if(err) throw err;
		var data = JSON.parse(events);
		//console.log(data);
		console.log("Length of events array: " + data.events.length);

		for(var i = 0; i < data.events.length; i++)
		{
			console.log("Checking event #" + (i+1));

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

		resp.writeHead(400, { 'Content-Type': 'application/json'});
		resp.end(JSON.stringify(errorJSON));
	});
});

// ADDING VENUES
/** When a POST request at '127.0.0.1:8090/events2018/venues/add', this will handle the request.
* 	This request should be to add a venue to venues.json
*
*
*
TO DO
// Remove validToken as valid tokens are generated and compared in the authentication service
// What does this need to return besides status code?
// How does this scale with a large number of events? Does the ID system maintain functionality?
//

**/

app.post('/events2017/venues/add', function (req, resp){

	//Pass POST request parameters into the function
	//
	var auth_token = req.body.auth_token;
	var name = req.body.name;
	var postcode = req.body.postcode; // these are optional, should check if undefined
	var town = req.body.town; //
	var url = req.body.url; //
	var icon = req.body.icon; //


	var notAuthorised = true;
	var notAllParameters = true;

//TO DO
// remove this?
//
	var validToken = "concertina";


// Check for required parameters.
// If either are false (likely undefined or empty string), notAllParameters will remain true
//
	if(name && auth_token){
		notAllParameters = false;
	}

//Assign optional parameters empty string value if they are undefined or otherwise falsey
//
	if(!postcode){
		postcode = "";
	}
	if (!town){
		town = "";
	}
	if(!url){
		url = "";
	}
	if(!icon){
		icon = "";
	}



//If any required parameter is missing, send an error in JSON and a 'Bad Request'status code in the header
//
	if(notAllParameters){//send 400 code in case of this error
		var errorJSON = {};
		errorJSON.error = "Venue not added. A valid authentication token and a venue name must be provided.";

		resp.writeHead(400, { 'Content-Type': 'application/json'});
		resp.end(JSON.stringify(errorJSON));
		return;
	}


//Make a GET request to the seperate authentication service (auth.js)
//
	var options = {
		url: "http://127.0.0.1:9000/events2017/authenticate",
		headers: {
			'Authorization' : auth_token //authentication service is configured to receive token through header
		}

	};



// The request itself is configured to receive a response from the service of "true" stored in the header
//
	request.get(options, function(err, resp){
		console.log("Attempting to connect to authentication service...");
		if(err) throw err;

		console.log("Using token: "+ auth_token);

		console.log(resp.headers.validtoken === "true");

		if(resp.headers.validtoken == "true"){
			notAuthorised = false;
		}

	// If this main service receives any other response besides "true", it will return an error message
	// in JSON with an HTTP status code in the header 401 'Unauthorized'
	//
		if(notAuthorised){
				var errorJSON = {};
				console.log("Token: "+ auth_token +" is incorrect");
				errorJSON.error = "Not authorised, wrong token";

				resp.writeHead(401, { 'Content-Type': 'application/json'});
				resp.end(JSON.stringify(errorJSON));
				return;
		}

	});



// Read venues.json and find the venue ID which should be assigned to the new venue when it is added
// Should it check to see if the venue already exists? Would it check by name alone? Maybe would prompt user
// with similar results to avoid users inputting multiple of the same venue (mutliple of the same venue would end up with the same id)
//
	fs.readFile("./venues.json", 'utf8', function (err, data) {
		if(err) throw err;

		var venue_id = "v_1"
		var position = 0;
		var parsedListJSON = JSON.parse(data);


		// Function for determining the length of venues.json
		//
			function length(x){
				return Object.keys(x).length;
			}

		console.log(length(parsedListJSON.venues));

		// This loop iterates through venues.json (after converted to a javascript object) to find the final venue id
		// It then assigns the new venue the next ID in sequence (eg final: v_2, next: v_3).
		// This assumes the venues are stored in sequence and that there are no holes in the list.
		//
		for(var i = 0; i < (1 + length(parsedListJSON.venues)); i++) {
			venue_id = 'v_' + (i + 1);
			console.log(i);
			}

		console.log(venue_id);

		// Create a string in JSON for new venue
		//
		var newVenue ='{"' + venue_id + '":{"name":"' + name + '","postcode":"' + postcode + '","town":"' + town +  '","url":"' + url + '","icon":"' + icon + '"}}';
		console.log(newVenue);

		// Convert string to javascript objects
		//
		var newVenueJSON = JSON.parse(newVenue);

		// Add new venue to list of venues
		//
		parsedListJSON.venues[venue_id] = newVenueJSON[venue_id];
		var postString = JSON.stringify(parsedListJSON)

		// Overwrite the list of venues to venues.json
		//
		fs.writeFile("./venues.json", postString, (err) => {
			if(err) throw err;
			console.log("File written");
		})

		resp.writeHead(200, { 'Content-Type' : 'application/json'});
		resp.end(postString);
		return;


	});
});


/** Adding Events
 * If the user enters an event_id which already exists, what should happen?
 * What other errors could occur with poor/malformed input?
 * If the user tries to add an event for a venue with doesn't exist
 */

//ADDING EVENTS
/**	When  POST reuqest at 127.0.0.1:8090 'http://127.0.0.1:8090/events2017/events/add'.
*		This request should be to add an event to events.json
*
*
*	Note that the venue ID is a required parameter
* and a venue with that ID must exist in venues.json for an event to be added at that venue.

TO DO
// How does this scale with large number of events/venues? Does the ID system maintain functionality?
//
**/

app.post('/events2017/events/add', function (req, resp){

	// Pass POST request parameters into the function
	//
	var auth_token = req.body.auth_token;
	var event_id = req.body.event_id.toLowerCase(); //maintain event ID standard by
	var title = req.body.title;
	var venue_id = req.body.venue_id;
	var date = req.body.date;
	var url = req.body.url; //optional
	var blurb = req.body.blurb; //optional

	var notAuthorised = true;
	var notAllParameters = true;
	var venueExists = false;
	var validToken = "concertina";


	function length(x){ //function for determining the length of venues.json
		return Object.keys(x).length;
	}

// Check if ALL required parameters have values.
// If any single required parameter is false (likely undefined or empty string), notAllParameters will remain true
//
	if(title && auth_token && title && venue_id && date){
		notAllParameters = false;
	}

// Assign optional parameters empty string value if they are undefined or otherwise falsey
//
	if(!url){
		url = "";
	}
	if(!blurb){
		blurb = "";
	}

// If any required parameter is missing, send an error in JSON and a 'Bad Request' status code in the headers
//
	if(notAllParameters){
		var errorJSON = {};
		errorJSON.error = "Event not added. A valid authentication token and all required parameters must be provided.";

		resp.writeHead(400, {'Content-Type': 'application/json'});
		resp.end(JSON.stringify(errorJSON));
		return;
	}


	//Make a GET request to the seperate authenticatation (auth.js)
	//
	var options = {
		url:"http://127.0.0.1:9000/events2017/authenticate",
		headers: {
			'Authorization' : auth_token //authentication service is configured to receive token through header
		}
	};


// The request itself is configured to receive a response from the service of "true" stored in the header
//
	request.get(option, function(err, resp){
		console.log("Attmepting to connect to authentication service...");

		if(err) throw err;

		console.log("Using token: " + auth_token);

		console.log(resp.headers.validtoken === "true");
		if(resp.headers.validtoken === "true"){
			notAuthorised = false;
			console.log(notAuthorised);
		}

	// If this main service receives any other response besides "true", it will return an error message
	// in JSON with an HTTP status code in the header 401 'Unauthorized'
	//
		if(notAuthorised){
			var errJSON = {};
			console.log("Token: " + auth_token + "is incorrect");
			errorJSON.error = "Not authorised, wrong token";

			resp.writeHead(401, { 'Content-Type': 'application/json'});
			resp.end(JSON.stringify(errorJSON));
			return;
		}

	});

// Read events.json
//
//
	fs.readFile("./events.json", 'utf8', function (err, data) {
		if(err) throw err;

		var parsedJSON = JSON.parse(data);


 // If the user enters an event ID which is already in use, return 400 'Bad Request ' and
 // an error msessage asking for a resubmission.
 //
		for(var i = 0; i < (parsedJSON.events.length); i++){

			if(parsedJSON.events[i].event_id === event_id){
				var errorJSON = {};
				errorJSON.error = "Event ID already in use. Please try again with a new event id.";

				resp.writeHead(400, {'Content-Type': 'application/json'});
				resp.end(JSON.stringify(errorJSON));
				return;
			}
		}

// Reade venues.json to find if the venue ID given in the request is associated with an existing venue
//
		fs.readFile("./venues.json", 'utf8', function (error, venues) {
			if(error) throw error;

			var parsedVenues = JSON.parse(venues);

			// Iterate through the venues.json to find if the venue exists, if it does, retrieve it as JSON object
			// This loop finds the ith property of venues.json and compares it to the inputted venue ID
			//
			for(var i = 0; i <(2 + length(parsedVenues.venues)); i++){
				if(Object.keys(parsedVenues.venues)[i] == venue_id){ //finds the ith property of venues.json and compares to the input id

					console.log(Object.keys(parsedVenues.venues)[i]);
					console.log("Venue Exists! " + venue_id);
					venueExists = true;

					var venueObj = parsedVenues.venues[venue_id];
					console.log(venueObj);
				}
			}

			// If after the loop, the venue ID is not found in venues.json,
			// return an error message saying this with the status code 400 'Bad Request'
			//
			if(venueExists == false){
				var errorJSON = {};
				console.log("Venue does not exist");
				errorJSON = {};
				errorJSON.error = "Venue Id does not refer to an existing venue. Please check if the venue id is correct or add the new venue.";
				resp.writeHead(400, {'Content-Type': 'application/json'});
				resp.end(JSON.stringify(errorJSON));
				return;
			}

			// Construct a javascript Date object and convert that date to ISO for later comparison
			//
			var dateObj = new Date(date);
			var dateISO = dateObj.toISOString();

			// Construct a javascript object with the data provided in the request
			//
			var postJSON = {
			"event_id": "",
			"title": "",
			"blurb": "",
			"date": "",
			"url": "",
			"venue": {}
			}
			postJSON.event_id = event_id;
			postJSON.title = title;
			postJSON.blurb = blurb;
			postJSON.date = date;
			postJSON.url = url;
			postJSON.venue = venueObj;
			postJSON.venue.venue_id = venue_id;


			// Add the new event object to the array of event objects from events.json
			//
			parsedJSON.events.push(postJSON);

			var stringJSON = JSON.stringify(parsedJSON);

			// Overwrite events.json with the new JSON string
			//
			fs.writeFile("./events.json", stringJSON, (err) => {
				if(err) throw err;

				console.log("File written");
			});

			resp.writeHead(200, {'Content-Type':'application/json'});
			resp.end(stringJSON);

			return;


		});



	});


});

// Starting the server
// Should this be at the top?
//
app.listen(8090, "127.0.0.1", function() {
	console.log('Server is listening at 127.0.0.1:8090');
});
