/**
 *  A node.js webservice for authentication using express and passport js
 *  Works with the app.js webservice for searching and adding events
 *  This seperate webservice provides authentication for when a user wishes to add events and venues
 *  Author: Julian Appleyard
 *  Version 0.2.0
 *
 *  Version Notes:
 *  Neither of the passport strategies are checking for IP address yet (as is set out in requirements)
 *  The JwtStrategy needs to issue the auth token for that IP address which makes the post request
 *  This authentication service is still not interacting with the main webservice or admin.html (which it needs to)
 *  Need to implement redirects and change the paths
 */

var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken');


//Use passport js authenticatio middleware: passportjs.org
var passport = require('passport');

// passport-jwt is a passport strategy for authenticating with JSON Web Token: www.npmjs.com/package/passport-jwt
var passportJWT = require('passport-jwt');
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;

// passport-custom is a passport strategy for authenticating with custom logic: www.npmjs.com/package/passport-custom
var passportCustom = require('passport-custom');
var CustomStrategy = passportCustom.Strategy;

//if this were a real app we would not use a method so insecure to store usernames and passswords
var users = [
  {
    id: 1,
    username: 'admin',
    password: 'letmein'
  }
];




// Create a custom strategy to allow for the token "concertina" to be valid
// "concertina"  should be valid for all times for IP addresses 129.234.xxx.yyy
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



//if the token is not "concertina" or is from the incorrect IP address, use this JWT strategy

var jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
jwtOptions.secretOrKey = 'concertina';

passport.use('jwt', new JwtStrategy(jwtOptions, function(jwt_payload, next){
  console.log('payload received', jwt_payload);

  var user = users[_.findIndex(users, {id:jwt_payload.id})];
  if(user){
    next(null, user);
  }
  else{
    next(null, false);
  }
}));


var app = express();
app.use(passport.initialize());
app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

app.get("/", function(req, resp) {
  resp.json({message: "Express is up!"});
});


//takes username, password, and IP address and issues an auth_token for that IP address which lasts 2 hours
app.post("/login", function(req, resp) {
  if(req.body.name && req.body.password){
    var username = req.body.name;
    var password = req.body.password;
  }

  var user = users[_.findIndex(users, {username: username})];
  if(!user){
    resp.status(401).json({message:"no such user found"});
  }
  if(user.password === req.body.password){

    var payload = {id: user.id};
    var token = jwt.sign(payload, jwtOptions.secretOrKey);
    resp.json({message: "ok", token: token});
  }else{
    resp.status(401).json({message:"passwords did not match"});
  }
});


//takes an auth_token and an IP address and returns whether or not the token is valid
// the auth_token "concertina" should be valid for all atimes for IP addresses 129.234.xxx.yyy
app.get("/secret", passport.authenticate(['jwt', 'tokenBackDoor'], { session: false}), function(req, resp){
    resp.json({message : "Success! You cannot see this without a token"});

});


/*
app.get("/secretDebug",
  function(req, resp, next){
    console.log(req.get('Authorization'));
    next();
  }, function(req, resp){
    resp.json("debugging");
  });
*/

app.listen(8090, "127.0.0.1", function(){
  console.log("Express running");
});
