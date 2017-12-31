/**
 *  A node.js webservice for authentication using express and passport js
 *  Works with the app.js webservice for searching and adding events
 *  This seperate webservice provides authentication for when a user wishes to add events and venues
 *  Author: Julian Appleyard
 *  Version 0.6.0
 *
 *  Version Notes:
 *  Neither of the passport strategies are checking for IP address yet (as is set out in requirements)
 *  The JwtStrategy needs to issue the auth token for that IP address which makes the post request
 *  This authentication service is still not interacting with the main webservice or admin.html (which it needs to)
 *  Need to implement redirects and change the paths
 */
// Token valid until Dec 29th 2017 at 17:21:24
//JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MTQ1NjgwODQsImlwIjoiMTI3LjAuMC4xIiwiaWQiOjEsImlhdCI6MTUxNDU2MDg4NH0.JEsHcXycVC4Rh0NgY8ho4Q8QnyUhb3vZAj4Cb69nLvE

var appBASE = "http://127.0.0.1:8090/events2017"
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');

// Range_Check is a nodejs package to validate IP addresses, check IP address version,
// check if IP is within a range etc: www.npmjs.com/package/range_check
//
var rangeCheck = require('range_check');



// Use passport js authentication middleware: passportjs.org
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

    var ipisinRange = rangeCheck.inRange(req.ip, '129.234.0.0/16');

    if(!ipisinRange){
      console.log("IP is not in secret token range");
      return next(null, false);
    }
    if(req.headers.authorization === "concertina" && ipisinRange){
      console.log("Secret backdoor token accepted");
      return next(null, true);

    }
    else{
      console.log("Not using secret backdoor token");
      return next(null, false);
    }
  }
));



// If the token is not "concertina" or is from the incorrect IP address, use this JWT strategy.
// Tokens should be checked for expiry (lasts 2h) and for their IP address
//
var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = 'concertina'; // this key is used to generate JWTs
jwtOptions.passReqToCallback = true;
jwtOptions.ignoreExpiration = true; //want to handle exipiration in body below

passport.use('jwt', new JwtStrategy(jwtOptions, function(req,jwt_payload, next){

  console.log('JWT payload received', jwt_payload); //debug

  var expDate = new Date(1000*jwt_payload.exp);

  console.log(expDate); //debug

  var user = users[_.findIndex(users, {id:jwt_payload.id})]; //find if token is associated with a valid user
  var now = Date.now();
  var sameIP = (req.ip === jwt_payload.ip);

  if(!sameIP){
    console.log("Token is not valid for this IP address");
    return next(null,false, {message: "Token is not valid for this IP address"});
  }

  if(now > expDate.getTime()){
    console.log("Token is expired");
    return next(null,false, {message: 'Token is expired'});
  }
  if(user){
    return next(null, user);
  }
  else{
    console.log("Not authorized.");
    return next(null, false);
  }

}));


var app = express();
app.use(passport.initialize());
app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

// Add headers to allow CORS
//
app.use(function (req, res, next) {

    // Website to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

    // Request headers to allow
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

// The expiration date (exp) is recorded in seconds since the epoch
// Date.now() outputs in milliseconds since the epoch, so divide by 1000 to get seconds
//
    var payload = {
      exp: Math.floor(Date.now() / 1000) + (120*60), //add 2 hours worth of seconds
      ip: req.ip,
      id: user.id
    };
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
app.get("/authenticate", passport.authenticate(['tokenBackDoor', 'jwt'],{session: false }), function(req, resp){
    
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
