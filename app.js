const express = require('express');
const auth0 = require('auth0');
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser');
var indexRouter = require('./routes/index.js');
const { auth } = require('express-openid-connect');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
require('dotenv').config();

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASEURL,
  clientID: process.env.CLIENTID,
  issuerBaseURL: process.env.ISSUER
}

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!user.verifyPassword(password)) { return done(null, false); }
      return done(null, user);
    });
  }
));


var app = express();
app.set("views", "views");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static("public"));
app.use(auth(config));
app.use(passport.initialize());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.redirect(req.oidc.isAuthenticated() ? '/landing' : '/index');
});
// change above redirect

app.post('/login', passport.authenticate('local', {successRedirect: '/landing', failureRedirect: '/index', failureFlash: true}));

app.get('/index', (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  const user = req.user;
  res.render('index', { isAuthenticated, user: req.oidc.user });
});

// app.get('/logout', (req, res) => {
//      res.sendFile(path.join(__dirname, '/login'));
// });

app.get('/callback', (req, res) => {
  res.redirect('/landing');
});

app.get('/landing', (req, res) => {
  res.render('landing', {user: req.oidc.user});
});

app.get('/project_upload', (req, res) => {
  res.render('project_upload');
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: 'soccerdb.calingaiy4id.us-east-2.rds.amazonaws.com',
  user: 'ale_lew_mus',
  password: 'QS7FhtcdeLbm',
  database: 'capstone_2223_bcareshub'
});

app.get('/data_display', (req, res) => {
  pool.query('SELECT * FROM projects', (error, results) => {
    if (error) {
      return res.send(error.message);
    }
    res.render('data_display', { projects: results });
  });
});

app.post('/add_project', (req, res) => {
  var count;
  // var project_count = pool. ('SELECT COUNT(*) FROM projects'); 
  pool.query('SELECT COUNT(*) FROM projects', function(err, results) {
    if (err) throw err;
    count = results +1;
  });
  console.log(req.body.Tags);
  // var project_count = pool.query('SELECT COUNT(*) FROM projects'); 
  // console.log(project_count);
  pool.query('INSERT INTO projects (project_id, student_id, title, abstract, tags, research_paper, teacher_id, teacher_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [count, 1, req.body.projectTitle, req.body.Abstract, req.body.Tags, req.body.researchPaper, 1, req.body.teacherSelection], (error, results) => {
    if (error) {
      return res.status(500).send(error);
    }
    res.redirect('/landing');
  });
});

app.post('/add_user', (req, res) => {
  var count;
  pool.query('SELECT COUNT(*) FROM users', function(err, results) {
    if (err) throw err;
    count = results[0]['COUNT(*)'] + 1;
  });
  pool.query('INSERT INTO users (first_name, last_name, email, account_type, user_token_auth0) VALUES (?, ?, ?, ?, ?)', [req.oidc.user.given_name, req.oidc.user.family_name, req.oidc.user.email, 'student', 1], (error, results) => {
    if (error) {
      return res.status(500).send(error);
    }
    res.redirect('/login')
  });
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
