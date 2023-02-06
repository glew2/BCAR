const express = require('express');
const auth0 = require('auth0');
const path = require('path');
const mysql = require('mysql');
const bodyParser = require('body-parser')

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.redirect('/login');
})

app.get('/login', (req, res) => {
  res.render('login');
});

// app.get('/logout', (req, res) => {
//      res.sendFile(path.join(__dirname, '/login'));
// });

app.get('/callback', (req, res) => {
  res.redirect('/landing');
});

app.get('/landing', (req, res) => {
  res.render('landing');
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

app.listen(3000, () => {
  console.log('Listening on port 3000');
});