const express = require('express');
const auth0 = require('auth0');
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const { auth, requiresAuth } = require('express-openid-connect');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const Auth0Strategy = require('passport-auth0');
require('dotenv').config();

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.SECRET,
  baseURL: process.env.BASEURL,
  clientID: process.env.CLIENTID,
  issuerBaseURL: process.env.ISSUER
}

const pool = mysql.createPool({
  host: 'soccerdb.calingaiy4id.us-east-2.rds.amazonaws.com',
  user: 'ale_lew_mus',
  password: 'QS7FhtcdeLbm',
  database: 'capstone_2223_bcareshub'
});

const app = express();
const authMiddleware = requiresAuth();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(auth(config));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// app.use(flash());
// app.use(session({
//   secret: 'tlb5enXf0s_7nh3inQRFARXGycH-58w3Z828_knp5zwLRb4ZEXBF1CbaH0iKGTAL',
//   resave: false,
//   saveUninitialized: false
// }));

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.redirect(req.oidc.isAuthenticated() ? '/landing' : '/index');
});

app.get('/index', (req, res) => {
  const isAuthenticated = req.isAuthenticated;
  const user = req.oidc.user;
  res.render('index', { isAuthenticated, user: req.oidc.user });
});

app.get('/logout', (req, res) => {
  res.render('login', { isAuthenticated, user: req.oidc.user});
});

app.get('/callback', (req, res) => {
  res.redirect('/landing');
});

app.get('/landing', (req, res) => {
  const isAuthenticated = req.isAuthenticated;
  const user = req.oidc.user;
  res.render('landing', { isAuthenticated, user: req.oidc.user});
});

app.get('/project_upload', (req, res) => {
  res.render('project_upload');
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get('/data_display', (req, res) => {
  // make this able to split/tokenize the input and run the query with all the inputs 
  const search_input = req.query.search;
  
  let sqlQuery = 'SELECT * FROM projects JOIN students ON projects.student_id=students.student_id JOIN users ON students.user_id=users.user_id';
  if (search_input) {
    // Query to be edited further
    // Student/Teacher Name, assays, etc. should be added in future edits
    sqlQuery += ` WHERE title LIKE "%${search_input}%" OR abstract LIKE "%${search_input}%" OR tags LIKE "%${search_input}%";`;
  }
  pool.query(sqlQuery, (error, results) => {
    if (error) {
      return res.send(error.message);
    }
    res.render('data_display', { projects: results });
  });
});

app.post('/add_project', (req, res) => {
  pool.query('INSERT INTO projects (student_id, title, abstract, research_paper, teacher_id, teacher_email) VALUES (?, ?, ?, ?, ?, ?)', [1, req.body.projectTitle, req.body.Abstract, req.body.researchPaper, 1, req.body.teacherSelection], (error, results) => {
    if (error) {
      return res.status(500).send(error);
    }
  });
  console.log("BEFORE LINE 120");
  pool.query('SELECT MAX(project_id) AS max_project_id FROM projects', function(err, results) {
    console.log("BEFORE LINE 122;");
    const max_project = results[0].max_project_id;
    console.log("MAXIMUM PROJECT: " + max_project);
    if (!(typeof req.body.tagOptions === undefined)) {
      // console.log("TYPE OF: " + typeof(req.body.tagOptions));
      // console.log("TAG OPTIONS: " + req.body.tagOptions);
      if (typeof req.body.tagOptions == 'string') {
        pool.query('INSERT INTO tags (tag_name) VALUES (?)', [req.body.tagOptions] , (error, results) => {
          if (error) throw error;
          pool.query('SELECT MAX(tag_id) AS max_tag_id FROM tags', function(err, results) {
            var max_tag = results[0].max_tag_id;
            pool.query('INSERT INTO project_tag_xref (tag_id, project_id) VALUES (?, ?)', [max_tag, max_project], (error, results) => {
              if (error) throw error;
            });
          });
        });
      }
      else {
        for (var i = 0; i < req.body.tagOptions.length; i++) {
          pool.query('INSERT INTO tags (tag_name) VALUES (?)', [req.body.tagOptions[i]] , (error, results) => {
            if (error) throw error;
          });
          pool.query('SELECT MAX(tag_id) AS max_tag_id FROM tags', function(err, results) {
            var max_tag = results[0].max_tag_id;
            pool.query('INSERT INTO project_tag_xref (tag_id, project_id) VALUES (?, ?)', [max_tag, max_project], (error, results) => {
              if (error) throw error;
            });
          });
        }
      }
    }
    res.redirect('/landing');
  });
});

app.get('/login', passport.authenticate('local', {
  successRedirect: '/landing', 
  failureRedirect: '/index',
  failureFlash: false
}));

app.post('/add_user', authMiddleware, (req, res) => {
  pool.query('SELECT * FROM users WHERE email = ?', [req.oidc.user.email], function(err, results) {
    if (err) throw err;

    if (results.length > 0) {
      return res.redirect('/login');
    }
    pool.query('INSERT INTO users (first_name, last_name, email, account_type) VALUES (?, ?, ?, ?)', [req.oidc.user.given_name, req.oidc.user.family_name, req.oidc.user.email, 'student'], (error, results) => {
      if (error) {
        return res.status(500).send(error);
      }
      res.redirect('/login');
    });
  });
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
