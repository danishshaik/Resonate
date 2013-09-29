var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , gravatar = require('nodejs-gravatar')
  , Firebase = require('firebase')
  , FacebookStrategy = require('passport-facebook').Strategy;

var FACEBOOK_APP_ID = "498959070190988"
var FACEBOOK_APP_SECRET = "90d354b1ee99b1d890500b268198d57a";


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Facebook profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the FacebookStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Facebook
//   profile), and invoke a callback with a user object.
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Facebook profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Facebook account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));




var app = express();

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.enable("jsonp callback");
});


app.get('/', function(req, res){
  if (req.user) { res.redirect('/account'); }
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  var userRef = new Firebase('http://resonate.firebaseio.com/' + req.user.id);
  userRef.on('value', function(s) {
    if (s.val() != null) {
      // if (s.val().resume != null) {
      //   res.redirect('/'+req.user.id);
      // } else {
        req.user.avatar = gravatar.imageUrl(req.user.emails[0].value, { "size": "600" });
        res.render('account', { user: req.user });
      // }
    } else {
      req.user.avatar = gravatar.imageUrl(req.user.emails[0].value, { "size": "600" });
      userRef.set({ user: req.user });
      res.render('account', { user: req.user });
    }
  });
});

app.post('/account', function(req, res) {
  var userRef = new Firebase('http://resonate.firebaseio.com/' + req.user.id + '/resume');
  userRef.set(req.body, function() {
    res.redirect('/'+req.user.id);
  });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['user_status', 'user_checkins', 'email', 'user_likes'] }),
  function(req, res){
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
  });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/random', function(req, res){
  var rootRef = new Firebase('http://resonate.firebaseio.com/');
  rootRef.on('value', function(s) {
    var i = 0;
    var rand = Math.floor(Math.random() * s.numChildren());
    s.forEach(function(s) {
      if (i == rand) {
        // picked random item, snapshot.val().
        res.render('resume', { resume: s.val().resume, user: s.val().user });
      }
      i++;
    });
  });
});

app.get('/:id', ensureAuthenticated, function(req, res) {
  var id = req.params.id;
  var genRef = new Firebase('http://resonate.firebaseio.com/'+id);
  genRef.on('value', function(s) {
    if (s.val() != null) {
      if (s.val().resume != null) {
        res.render('resume', { resume: s.val().resume, user: s.val().user });
      } else {
        res.redirect('/account');
      }
    } else {
      res.redirect('/account');
    }
  });
}); 

app.listen(3000);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
