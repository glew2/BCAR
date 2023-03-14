const express = require('express');
const auth0 = require('auth0');
const path = require('path');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');

const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: './temp/' });

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
app.use(passport.initialize());

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
  const isAuthenticated = req.oidc.isAuthenticated();
  const user = req.oidc.user;
  res.render('index', { isAuthenticated, user: req.oidc.user });
});

app.get('/logout', (req, res) => {
  const isAuthenticated = req.oidc.isAuthenticated();
  const user = req.oidc.user;

  res.render('logout', { isAuthenticated, user: req.oidc.user});
});

app.get('/callback', (req, res) => {
  res.redirect('/index');
});

app.get('/landing', (req, res) => {
  const isAuthenticated = req.oidc.isAuthenticated();
  if (isAuthenticated) {
    const user = req.oidc.user;
    console.log('isAuthenticated:', isAuthenticated);
    let user_projects_query =  `
      SELECT p.*, GROUP_CONCAT(t.tag_name SEPARATOR ', ') AS tag_names, u.first_name, u.last_name, u.email
      FROM projects p
      LEFT JOIN project_tag_xref x 
      ON p.project_id = x.project_id
      LEFT JOIN tags t 
      ON x.tag_id = t.tag_id
      JOIN students s ON p.student_id = s.student_id
      JOIN users u ON s.user_id = u.user_id
    `
    user_projects_query+=`WHERE u.email='` + user.email + `'`;
    user_projects_query+=`GROUP BY p.project_id`;
    pool.query(user_projects_query, (error, results) => {
      if (error) {
        return res.send(error.message);
      }
      res.render('landing', { isAuthenticated, projects: results, user: req.oidc.user });
    });
  }
  else {
    res.render('landing', { isAuthenticated });
  }
});

app.get('/project_upload', (req, res) => {
  const isAuthenticated = req.oidc.isAuthenticated();
  res.render('project_upload', { isAuthenticated, user: req.oidc.user });
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get('/data_display', (req, res) => {
  const isAuthenticated = req.oidc.isAuthenticated();
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
    res.render('data_display', { isAuthenticated, projects: results, user: req.oidc.user });
  });

  // QUERY FOR STUDENT ID;
});

app.get('/pdf', (req, res) => {
  pool.query('SELECT research_paper FROM projects WHERE project_id = 118', (error, results, fields) => {
    if (error) throw error;

    if (results.length > 0) {
      const pdfData = results[0].research_paper;

      // Create a Blob object from the PDF data
      const pdfBuffer = Buffer.from(pdfData, 'binary');

      // Set the Content-Type header to application/pdf
      res.setHeader('Content-Type', 'application/pdf');
      // Send the Blob object as the response
      res.status(200).send(pdfBuffer);
    } else {
      res.status(404).send('PDF data not found');
    }
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


// app.get('/login', passport.authenticate('local', {
//   successRedirect: '/landing', 
//   failureRedirect: '/index',
//   failureFlash: false
// }));

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
