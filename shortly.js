var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'keyboard cat',
  cookie: { 
    maxAge: 6000000,
  }
}));

var checkSession = function(req, res, next) {
  if (req.session.loggedIn === true) {
    next();
  } else {
    res.render('login');
  }
};

app.get('/logout', function(req, res) {
  req.session.destroy();
  res.render('login');
});

app.get('/', checkSession, function(req, res) {
  res.render('index');
});

app.get('/create', checkSession, function(req, res) {
  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/links', checkSession, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/signup', function(req, res) {
  var info = req.body;
  
  new User({ username: info.username }).fetch().then(function(found) {
    if (found) {
      console.log('Username already in use.');
      res.render('/signup');
    } else {
      Users.create({
        username: info.username,
        password: info.password,
      })
        .then(function(newUser) {
          req.session.loggedIn = true;
          res.status(201).redirect('/');
        });
    }
  });
});

app.post('/login', function(req, res) {
  var info = req.body;

  new User({ username: info.username }).fetch().then(function(user) {
    if (!user) {
      console.log('Username not found');
      res.redirect('/login');
    } else {
      if (bcrypt.compareSync(info.password, user.attributes.password)) {
        req.session.loggedIn = true;
        res.redirect('/');
      } else {
        console.log('bad credentials');
        res.redirect('/login');
      }
      //res.render('index');
    }
  });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
          .then(function(newLink) {
            res.status(200).send(newLink);
          });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
