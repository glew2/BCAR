const express = require('express');
const auth0 = require('auth0');
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: './temp/' });

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

const app = express();

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

app.post('/login', passport.authenticate('local', {successRedirect: '/landing', failureRedirect: '/index', failureFlash: true}));

app.get('/index', (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  const user = req.oidc.user;
  res.render('index', { isAuthenticated, user: req.oidc.user });
});

app.get('/logout', (req, res) => {
  res.render('login');
});

app.get('/callback', (req, res) => {
  res.redirect('/landing');
});

app.get('/landing', (req, res) => {
  res.render('landing', {user: req.oidc.user});
});

app.get('/project_upload', (req, res) => {
  res.render('project_upload', {user: req.oidc.user});
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

  // TODO make this able to split/tokenize the input and run the query with all the inputs 
  const search_input = req.query.search;
  let sqlQuery = `
             SELECT p.*, GROUP_CONCAT(t.tag_name SEPARATOR ', ') AS tag_names, u.first_name, u.last_name
             FROM projects p
             LEFT JOIN project_tag_xref x 
              ON p.project_id = x.project_id
             LEFT JOIN tags t 
              ON x.tag_id = t.tag_id
             JOIN students s ON p.student_id = s.student_id
             JOIN users u ON s.user_id = u.user_id
  `
  if (search_input) {
    // Student/Teacher Name, assays, etc. should be added in future edits
    sqlQuery += ` 
              WHERE p.title LIKE '%${search_input}%'
                OR p.abstract LIKE '%${search_input}%'
                OR t.tag_name LIKE '%${search_input}%'
                OR u.first_name LIKE '%${search_input}%'
                OR u.last_name LIKE '%${search_input}%'`;
  }
  sqlQuery+=` GROUP BY p.project_id`;

  pool.query(sqlQuery, (error, results) => {
    if (error) {
      return res.send(error.message);
    }
    res.render('data_display', { projects: results, user: req.oidc.user });
  });
});

app.post('/add_project', upload.single('researchPaper'), (req, res) => {
  const pdfFile = req.file;
  var pdfData;
  if (pdfFile) {
    pdfData = fs.readFileSync(pdfFile.path).toString('base64');
  }
  pool.query('INSERT INTO projects (student_id, title, abstract, research_paper, teacher_id, teacher_email) VALUES (?, ?, ?, ?, ?, ?)', [2, req.body.projectTitle, req.body.Abstract, pdfData, 1, req.body.teacherSelection], (error, results) => {
    if (error) {
      return res.status(500).send(error);
    }
    // pool.query('SELECT LAST_INSERT_ID() as new_primary_key_value', function(err, results) {
      // const max_project = results[0].new_primary_key_value;
      const max_project = results.insertId;
      console.log("MAXIMUM PROJECT: " + max_project);
      if (!(typeof req.body.tagOptions === undefined)) {
        // console.log("TYPE OF: " + typeof(req.body.tagOptions));
        // console.log("TAG OPTIONS: " + req.body.tagOptions);
        if (typeof req.body.tagOptions == 'string') {
          pool.query('INSERT INTO tags (tag_name) VALUES (?)', [req.body.tagOptions] , (error, results) => {
            if (error) throw error;
            // pool.query('SELECT LAST_INSERT_ID() as new_primary_key_value', function(err, results) {
              // var max_tag = results[0].new_primary_key_value;
            var max_tag = results.insertId;
            pool.query('INSERT INTO project_tag_xref (tag_id, project_id) VALUES (?, ?)', [max_tag, max_project], (error, results) => {
              if (error) throw error;
            });
            // });
          });
        }
        else {
          for (var i = 0; i < req.body.tagOptions.length; i++) {
            pool.query('INSERT INTO tags (tag_name) VALUES (?)', [req.body.tagOptions[i]] , (error, results) => {
              if (error) throw error;
              // pool.query('SELECT LAST_INSERT_ID() as new_primary_key_value', function(err, results) {
              // var max_tag = results[0].new_primary_key_value;
              var max_tag = results.insertId;
              pool.query('INSERT INTO project_tag_xref (tag_id, project_id) VALUES (?, ?)', [max_tag, max_project], (error, results) => {
                if (error) throw error;
              });
              // });
            });
          }
        }
      }
      res.redirect('/data_display');
    // });  
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
