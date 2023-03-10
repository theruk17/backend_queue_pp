var express = require('express')
var cors = require('cors')
var app = express()
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const saltRounds = 10
const jwt = require('jsonwebtoken')
const secret = 'queuepakplee'
require('dotenv').config()

const connection = mysql.createConnection(process.env.DATABASE_URL)

app.use(cors())

app.post('/data', jsonParser, function (req, res, next) {
    connection.query(
        'SELECT * FROM users WHERE uid = ?',
        [req.body.uid],
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            } else {
                res.json(results)
            }
        }
    )
})

app.put('/register_line', jsonParser, function (req, res, next) {
    
        const uid = req.body.uid
        const pic = req.body.pic
    
        connection.execute(
            'INSERT INTO users (uid, pic_url) VALUES (?, ?) ON DUPLICATE KEY UPDATE uid=?, pic_url=?',
            [uid, pic, uid, pic],
            function(err, results, fields) {
                if (err) {
                    res.send({ status: 'error', message: err })
                    return
                } else {
                    res.send('done');
                }
                
            
            }
        )
   
    
  
})

app.post('/check_cid', jsonParser, function (req, res, next) {
    connection.query(
        'SELECT cid FROM users WHERE uid=?',
        [req.body.uid],
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            } else {
                res.json(results)
            }
            
        })
})

app.put('/register_user', jsonParser, function (req, res, next) {
    const cid = req.body.idcard
    const fname = req.body.fname
    const lname = req.body.lname
    connection.execute(
        'UPDATE users SET cid=?, fname=?, lname=? WHERE uid=?',
        [cid, fname, lname, req.body.uid],
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            } else {
                res.json('done')
            }
            
        })
})

app.post('/register', jsonParser, function (req, res, next) {
    bcrypt.hash(req.body.cid, saltRounds, function(err, hash) {
        
        var fname = req.body.fname
        var lname = req.body.lname
    
        connection.execute(
            'INSERT INTO users (cid, fname, lname) VALUES (?, ?, ?)',
            [hash, fname, lname],
            function(err, results, fields) {
                if (err) {
                    res.json({status: 'error', message: err})
                    return
                }
                res.json({status: 'ok'})
            
            }
        )
    })
    
  
})

app.post('/login', jsonParser, function (req, res, next) {
    
    connection.execute(
        'SELECT * FROM users WHERE fname=?',
        [req.body.fname],
        function(err, users, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            if (users.length == 0) {
                res.json({status: 'error', message: 'no user found'})
                return
            }
            bcrypt.compare(req.body.cid, users[0].cid, function(err, isLogin) {
                if (isLogin) {
                    var token = jwt.sign({ fname: users[0].fname}, secret, { expiresIn: '1h'})
                    res.json({status: 'ok', message: 'success', token})
                    
                } else {
                    res.json({status: 'error', message: 'failed'})
                }
            })
            
        
        }
    )
})

app.post('/auth', jsonParser, function (req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, secret)
        res.json({decoded})
    } catch(err) {
        res.json({status: 'error', message: err})
    }
    
})


app.get('/holiday', jsonParser, function (req, res, next) {
    connection.query(
        'SELECT date_holiday FROM holiday',
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            res.json(results)
        })
})

app.get('/checkdate', jsonParser, function (req, res, next) {
    connection.query(
        "SELECT booking_date FROM booking_list WHERE booking_status = 'Y' GROUP BY booking_date HAVING COUNT(booking_date) > 1",
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            res.json(results)
        })
})

app.post('/checktime', jsonParser, function (req, res, next) {
    connection.query(
        "SELECT booking_time FROM booking_list WHERE booking_status='Y' AND booking_date=?",
        [req.body.date],
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            res.json(results)
        })
})

app.post('/submit', jsonParser, function (req, res, next) {
    let uid = req.body.userid
    let date = req.body.date
    let time = req.body.time
    let service = req.body.service
    connection.query(
        "INSERT INTO booking_list (uid, booking_date, booking_time, booking_service) VALUES (?, ?, ?, ?)",
        [uid, date, time, service],
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            res.json('success')
        })
})

app.listen(3333, function () {
  console.log('CORS-enabled web server listening on port 3333')
})