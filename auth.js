/**
 *  A node.js webservice for authentication using express and passport js
 *  Works with the app.js webservice for searching and adding events
 *  This seperate webservice provides authentication for when a user wishes to add events and venues
 *  Author: Julian Appleyard
 *  Version 0.4.3
 *
 *  Version Notes:
 *  Neither of the passport strategies are checking for IP address yet (as is set out in requirements)
 *  The JwtStrategy needs to issue the auth token for that IP address which makes the post request
 *  This authentication service is still not interacting with the main webservice or admin.html (which it needs to)
 *  Need to implement redirects and change the paths
 */
var appBASE = "http://127.0.0.1:8090/events2017"
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');




//Use passport js authenticatio middleware: passportjs.org
//
var passport = require('passport');

// Passport-jwt is a passport strategy for authenticating with JSON Web Token: www.npmjs.com/package/passport-jwt
//
var passportJWT = require('passport-jwt');
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

// Passport-custom is a passport strategy for authenticating with custom logic: www.npmjs.com/package/passport-custom
//
var passportCustom = require('passport-custom');
var CustomStrategy = passportCustom.Strategy;

// If this were a real app we would not use a method so insecure to store usernames and passswords
//
var users = [
  {
    id: 1,
    username: 'admin',
    password: 'letmein'
  }
];




// Create a custom strategy to allow for the token "concertina" to be valid
// "concertina"  should be valid for all times for IP addresses 129.234.xxx.yyy
//
passport.use('tokenBackDoor', new CustomStrategy(
  function(req, next){
    console.log(req.headers.authorization);
    if(req.headers.authorization === "concertina"){
      next(null, true);
      console.log("Secret backdoor token accepted");
    }
    else{
      console.log("Not using secret backdoor token");
      next(null, false);
    }
  }
));



// If the token is not "concertina" or is from the incorrect IP address, use this JWT strategy.
// Tokens should be checked for expiry and for their IP address
//
var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = 'concertina'; // this key is used to generate JWTs
jwtOptions.expiresIn = "2h";

passport.use('jwt', new JwtStrategy(jwtOptions, function(jwt_payload, next){
  console.log('payload received', jwt_payload);
  console.log(next);
  var user = users[_.findIndex(users, {id:jwt_payload.id})];

// Checks jwt payload IP address against
//= jwt_payload.ip

  if(user){
    next(null, user);
  }
  else{
    console.log("Not authorized.");
    next(null, false);
  }

}));


var app = express();
app.use(passport.initialize());
app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

// Add headers to allow CORS
//
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});







app.get("/", function(req, resp) {
  resp.json({message: "Express is up!"});
});


// Takes username, password, and IP address and issues an auth_token for that IP address which lasts 2 hours
//
app.post("/login", function(req, resp) {
  if(req.headers.username && req.headers.password){
    var username = req.headers.username;
    var password = req.headers.password;
  }
  else{
    var errorJSON = {};
    errorJSON.error = "Username and Password are required";
    resp.writeHead(400, {'Content-Type': 'application/json'});
    resp.end(JSON.stringify(errorJSON));
    return;
  }

  var user = users[_.findIndex(users, {username: username})];
  if(!user){
    resp.status(401).json({message:"no such user found"});
  }
  if(user.password === password){
//maybe expiration needs to be set here
    var payload = {ip: req.ip, id: user.id};
    var token = jwt.sign(payload, jwtOptions.secretOrKey);
    console.log("Authentication Successful. Token produced");
    resp.json({message: "ok", token: token});
  }else{
    resp.status(401).json({message:"passwords did not match"});
  }
});


// Takes an auth_token and an IP address and returns whether or not the token is valid
// the auth_token "concertina" should be valid for all atimes for IP addresses 129.234.xxx.yyy
//
app.get("/events2017/authenticate", passport.authenticate(['jwt', 'tokenBackDoor'],{session: false }), function(req, resp){

    console.log(req.ip);
    console.log("Request authenticated");
    var jsonSent ={};
    jsonSent.message = "Success! You cannot see this without a token!";
    jsonSent.validToken = true;
    resp.writeHead(200, {'validToken': true});
    resp.end(JSON.stringify(jsonSent));
    return;
});

app.listen(9000, "127.0.0.1", function(){
  console.log("Express running");
});
