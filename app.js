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
  pool.query('SELECT * FROM projects JOIN students ON projects.student_id=students.student_id JOIN users ON students.user_id=users.user_id;', (error, results) => {
    if (error) {
      return res.send(error.message);
    }
    res.render('data_display', { projects: results });
  });
});

app.post('/add_project', (req, res) => {
  // var project_count;
  // var tag_count;
  // var project_count = pool. ('SELECT COUNT(*) FROM projects'); 
  // pool.query('SELECT COUNT(*) FROM projects', function(err, results) {
  //   if (err) console.log('ERROR');
  //   console.log("RESULTS: " + results[0]['COUNT(*)']);
  //   project_count = parseInt(results[0]["COUNT(*)"]) + 1;
  //   console.log("PROJECT COUNT: " + project_count);
  //   pool.query('SELECT COUNT(*) FROM tags', function(err, results) {
  //     if (err) console.log('ERROR');
  //     console.log("RESULTS: " + results[0]['COUNT(*)']);
  //     tag_count = parseInt(results[0]["COUNT(*)"]) + 1;
  //     console.log("TAG COUNT: " + tag_count);
  //     var result = "";
  //     if (!(typeof req.body.tagOptions === undefined)) {
  //       console.log("TYPE OF: " + typeof(req.body.tagOptions));
  //       console.log("TAG OPTIONS: " + req.body.tagOptions);
  //       if (typeof req.body.tagOptions == 'string') {
  //         pool.query('INSERT INTO project_tag_xref (tag_id, project_id) VALUES (?, ?)', [tag_count, project_count], (error, results) => {
  //           if (error) throw error;
  //         });
          
  //         pool.query('INSERT INTO tags (tag_id, tag_name) VALUES (?, ?)', [tag_count, req.body.tagOptions] , (error, results) => {
  //           if (error) throw error;
  //         });
  //       }
  //       else {
  //         for (var i = 0; i < req.body.tagOptions.length; i++) {
  //           pool.query('INSERT INTO project_tag_xref (tag_id, project_id) VALUES (?, ?)', [tag_count, project_count], (error, results) => {
  //             if (error) throw error;
  //           });
            
  //           pool.query('INSERT INTO tags (tag_id, tag_name) VALUES (?, ?)', [tag_count, req.body.tagOptions[i]] , (error, results) => {
  //             if (error) throw error;
  //           });
  //           tag_count = tag_count + 1;

  //           // result = result + req.body.tagOptions[i] + ", ";  
  //         // }
  //         // if (result.length > 0) { 
  //         //   result = result.substr(0, result.length - 2);
  //         }
  //       }
  //     }
  //     // console.log(req.body.tagOptions[0]);
  //     // var project_count = pool.query('SELECT COUNT(*) FROM projects'); 
  //     // console.log(project_count);
  //     pool.query('INSERT INTO projects (student_id, title, abstract, research_paper, teacher_id, teacher_email) VALUES (?, ?, ?, ?, ?, ?)', [1, req.body.projectTitle, req.body.Abstract, req.body.researchPaper, 1, req.body.teacherSelection], (error, results) => {
  //       if (error) {
  //         return res.status(500).send(error);
  //       }
  //       res.redirect('/landing');  
  //     });
  //   });
  // });
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
  });
  res.redirect('/landing');
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});