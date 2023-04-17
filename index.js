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
const axios = require('axios')

const connection = mysql.createConnection(process.env.DATABASE_URL)


app.use(cors())

app.get('/admin_data', jsonParser, function (req, res, next) {
    connection.query(
        'SELECT b.id, u.pic_url, u.cid, CONCAT(u.fname," ",u.lname) as fullname, b.booking_service, b.booking_date, b.booking_time, b.booking_status FROM booking_list b LEFT JOIN users u ON u.uid=b.uid',
        
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
            'INSERT INTO users (uid, pic_url) VALUES (?, ?) ON DUPLICATE KEY UPDATE uid= ?, pic_url= ?',
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
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        var username = req.body.username
        var fname = req.body.fname
        var lname = req.body.lname
    
        connection.execute(
            'INSERT INTO staff (username, password, fname, lname) VALUES (?, ?, ?, ?)',
            [username, hash, fname, lname],
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
        'SELECT * FROM staff WHERE username=?',
        [req.body.username],
        function(err, users, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            if (users.length == 0) {
                res.json({status: 'error', message: 'no user found'})
                return
            }
            bcrypt.compare(req.body.password, users[0].password, function(err, isLogin) {
                if (isLogin) {
                    var token = jwt.sign({ username: users[0].username}, secret, { expiresIn: '1h'})
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
        const token = req.body.headers.Authorization.split(' ')[1]
        const decoded = jwt.verify(token, secret)
        res.json({status: 'ok', decoded})
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

app.post('/checkbooking', jsonParser, function (req, res, next) {
    const uid = req.body.uid
    connection.query(
        "SELECT * FROM booking_list WHERE booking_status = 'Y' AND uid = ?",
        [uid],
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

app.put('/cancel_queue', jsonParser, function (req, res, next) {
    const uid = req.body.uid
    connection.query(
        "UPDATE booking_list SET booking_status = 'N' WHERE uid = ?",
        [uid],
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            res.json("done")
        })
})

app.post('/submit', jsonParser, function (req, res, next) {
    let uid = req.body.uid
    let date = req.body.date
    let dateTH = req.body.dateth
    let time = req.body.time
    let service = req.body.service
    let data = JSON.stringify({
        "to": uid,
        "messages": [
          {
            "type": "flex",
            "altText": "จองคิวสำเร็จ",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": "คุณได้จองคิว",
                    "weight": "bold",
                    "color": "#1DB446",
                    "size": "sm",
                    "align": "center"
                  },
                  {
                    "type": "text",
                    "text": dateTH,
                    "weight": "bold",
                    "size": "xl",
                    "margin": "md",
                    "align": "center"
                  },
                  {
                    "type": "text",
                    "text": time,
                    "size": "xl",
                    "wrap": true,
                    "weight": "bold",
                    "align": "center"
                  },
                  {
                    "type": "separator",
                    "margin": "xxl"
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "xxl",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "text",
                        "text": "บริการ "+service,
                        "size": "lg",
                        "weight": "bold",
                        "align": "center"
                      },
                      {
                        "type": "separator",
                        "margin": "xxl"
                      },
                      {
                        "type": "text",
                        "text": "โรงพยาบาลปากพลี นครนายก",
                        "align": "center"
                      }
                    ]
                  }
                ],
                
              },
              "styles": {
                "footer": {
                  "separator": true
                }
              }
            }
          }
        ]
      });

    connection.query(
        "INSERT INTO booking_list (uid, booking_date, booking_time, booking_service) VALUES (?, ?, ?, ?)",
        [uid, date, time, service],
        function(err, results, fields) {
            if (err) {
                res.json({status: 'error', message: err})
                return
            }
            
            axios.post('https://api.line.me/v2/bot/message/push', data, {
                headers: {
                    'Authorization': 'Bearer '+process.env.KEY_API,
                    'Content-Type': 'application/json'
                },
            })
            .then(function (response) {
                console.log(JSON.stringify(response.data));
                
            })
            .catch(function (error) {
                console.log(error);
            });
            res.json('done')
        })
})

app.listen(3333, function () {
  console.log('CORS-enabled web server listening on port 3333')
})