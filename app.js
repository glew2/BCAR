const express = require('express');
const auth0 = require('auth0');
const path = require('path');
const mysql = require('mysql');

const app = express();

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

app.listen(3000, () => {
  console.log('Listening on port 3000');
});