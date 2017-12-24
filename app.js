/**
	A nodejs web service for searching and adding events and venues using expressjs
	Author: Julian Appleyard
Version 0.3.0
Really needs error handling
Need to return HTTP status codes
make a 404 page
utilize truthy/falsey to streamline code
 */


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

	if(search_id === undefined){
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
})


app.post('/events2017/venues/add', function (req, resp){
	var auth_token = req.body.auth_token;
	var name = req.body.name;
	var postcode = req.body.postcode; // these are optional, should check if undefined
	var town = req.body.town; //
	var url = req.body.url; //
	var icon = req.body.icon; //

	var notAuthorised = true;
	var notAllParameters = true;
	var validToken = "concertina";


	function length(x){ //function for determining the length of venues.json
		return Object.keys(x).length;
	}


	if(name !== undefined && auth_token !== undefined){
		notAllParameters = false;
	}

	if(postcode === undefined){
		postcode = "";
	}
	if (town === undefined){
		town = "";
	}
	if(url === undefined){
		url = "";
	}
	if(icon === undefined){
		icon = "";
	}

	)
	if(auth_token === validToken){
		notAuthorised = false;
	}



	if(notAuthorised){ //send 403 error in case of error
			var errorJSON = {};
			errorJSON.error = "Not authorised, wrong token";

			resp.writeHead(401, { 'Content-Type': 'application/json'});
			resp.end(JSON.stringify(errorJSON));
			return;
	}

	if(notAllParameters){//send 400 code in case of this error
		var errorJSON = {};
		errorJSON.error = "Venue not added. A valid authentication token and a venue name must be provided.";

		resp.writeHead(400, { 'Content-Type': 'application/json'});
		resp.end(JSON.stringify(errorJSON));
		return;
	}



	fs.readFile("./venues.json", 'utf8', function (err, data) {

		var venue_id = "v_1"
		var position = 0;
		var parsedJSON = JSON.parse(data);

		if(err) throw err;

//iterate through venues to find the end of the list and there the id of the event to be entered

		console.log(length(parsedJSON.venues));


		for(var i = 0; i < (2 + length(parsedJSON.venues)); i++) {
			venue_id = 'v_' + i;
			console.log(i);
			}

console.log(venue_id);
		var newVenue ='{"' + venue_id + '":{"name":"' + name + '","postcode":"' + postcode + '","town":"' + town +  '","url":"' + url + '","icon":"' + icon + '"}}';
		console.log(newVenue);

		var newJSON = JSON.parse(newVenue);
		parsedJSON.venues[venue_id] = newJSON[venue_id];
		var postString = JSON.stringify(parsedJSON)

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

app.post('/events2017/events/add', function (req, resp){
	var auth_token = req.body.auth_token;
	var event_id = req.body.event_id.toLowerCase(); //maintain event id standard
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

//check if all required parameters have values. If any one does not, notAllParameters will be made false, causing a later if statement to output an error
	if(title !== undefined && auth_token !== undefined && title !== undefined && venue_id !== undefined && date !== undefined){
		notAllParameters = false;
	}

//If optional parameters are not provided, give them the value of the empty string
	if(url === undefined){
		url = "";
	}
	if(blurb === undefined){
		blurb = "";
	}

	if(auth_token == validToken){
		notAuthorised = false; //only if they have the correct token will they be allowed to proceed
	}

	if(notAuthorised){
		var errorJSON = {};
		errorJSON.error = "Not authorised, wrong token";

		resp.writeHead(401, {'Content-Type': 'application/json'});
		resp.end(JSON.stringify(errorJSON));
		return;
	}

	if(notAllParameters){
		var errorJSON = {};
		errorJSON.error = "Event not added. A valid authentication token and all required parameters must be provided.";

		resp.writeHead(400, {'Content-Type': 'application/json'});
		resp.end(JSON.stringify(errorJSON));
		return;
	}


	var dateObj = new Date(date);

	fs.readFile("./events.json", 'utf8', function (err, data) {
		if(err) throw err;

		var parsedJSON = JSON.parse(data);


 //if the user enters an event id which is already in use, return error and ask for resubmission
		for(var i = 0; i < (parsedJSON.events.length); i++){

			if(parsedJSON.events[i].event_id === event_id){
				var errorJSON = {};
				errorJSON.error = "Event id already in use. Please try again with a new event id.";

				resp.writeHead(400, {'Content-Type': 'application/json'});
				resp.end(JSON.stringify(errorJSON));
				return;
			}
		}

		fs.readFile("./venues.json", 'utf8', function (error, venues) {
			if(error) throw error;
			var parsedVenues = JSON.parse(venues);

			//iterate through the venues.json to find if the venue exists, if it does, retrieve it as JSON object
			for(var i = 0; i <(2 + length(parsedVenues.venues)); i++){
				if(Object.keys(parsedVenues.venues)[i] == venue_id){ //finds the ith property of venues.json and compares to the input id

					console.log(Object.keys(parsedVenues.venues)[i]);
					console.log("Venue Exists! " + venue_id);
					venueExists = true;

					var venueObj = parsedVenues.venues[venue_id];
					console.log(venueObj);
				}
			}

			//if after the loop, the venue is not found, return an error
			if(venueExists == false){
				var errorJSON = {};
				console.log("Venue does not exist");
				errorJSON = {};
				errorJSON.error = "Venue Id does not refer to an existing venue. Please check if the venue id is correct or add the new venue.";
				resp.writeHead(400, {'Content-Type': 'application/json'});
				resp.end(JSON.stringify(errorJSON));
				return;
			}

			//Now that all of these checks are over, can proceed with construction of date and JSON objects
			var dateObj = new Date(date);
			var dateISO = dateObj.toISOString();

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


			//now need to add to events list
			parsedJSON.events.push(postJSON);

			//console.log(JSON.stringify(postJSON));

			var stringJSON = JSON.stringify(parsedJSON);

			//overwrite events.json with the new JSON string
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

app.listen(8090, "127.0.0.1", function() {
	console.log('Server is listening at 127.0.0.1:8090');
}
