var express = require("express");
var cors = require("cors");
var app = express();
var bodyParser = require("body-parser");
var jsonParser = bodyParser.json();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const secret = "pakplee";
require("dotenv").config();
const axios = require("axios");
const dayjs = require("dayjs");
require("dayjs/locale/th");
const dayLocaleData = require("dayjs/plugin/localeData");
dayjs.extend(dayLocaleData);
dayjs.locale("th");

const connection = mysql.createConnection(process.env.DATABASE_URL);

app.use(cors());

app.get("/admin_data", jsonParser, function (req, res, next) {
  connection.query(
    `SELECT b.id, u.pic_url, u.cid, CONCAT(u.pname,u.fname," ",u.lname) as fullname, b.booking_service, b.booking_date, b.booking_time, b.booking_status 
      FROM booking_list b 
      LEFT JOIN users u ON u.cid=b.cid
      ORDER BY b.id DESC`,

    function (err, results, fields) {
      if (err) {
        res.json({ status: "error", message: err });
        return;
      } else {
        res.json(results);
      }
    }
  );
});

app.put("/updatestatus/:id", jsonParser, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  connection.query(
    `UPDATE booking_list SET booking_status = ? WHERE id = ?`,
    [status, id],
    (err) => {
      if (err) throw err;
      res.send("Status updated successsfully");
    }
  );
});

app.post("/data", jsonParser, function (req, resp, next) {
  const cid = req.body.cid;
  connection.execute(
    "SELECT * FROM users WHERE cid = ?",
    [cid],
    function (err, results, fields) {
      if (err) {
        resp.json({ status: "error", message: err });
        return;
      } else {
        resp.json(results);
      }
    }
  );
});

app.post("/register_line", jsonParser, function (req, resp, next) {
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            let pic = res.data.pictureUrl;
            if (pic == null || pic == "") {
              pic =
                "https://firebasestorage.googleapis.com/v0/b/test-ae239.appspot.com/o/noimage.png?alt=media&token=80c1b35e-5c7b-42dc-9cf5-8e296ed86253";
            }
            connection.query(
              "SELECT uid, pic_url FROM users WHERE uid= ? and main = 'Y'",
              [uid],
              function (err, results, fields) {
                if (results.length > 0) {
                  if (results[0].uid === uid && results[0].pic_url === pic) {
                    connection.query(
                      "SELECT cid FROM users WHERE uid=?",
                      [uid],
                      function (err, results, fields) {
                        if (err) {
                          resp.json({ status: "error", message: err });
                          return;
                        } else {
                          resp.json(results);
                        }
                      }
                    );
                    return;
                  } else if (
                    results[0].uid === uid &&
                    results[0].pic_url != pic
                  ) {
                    connection.execute(
                      "UPDATE users SET pic_url = ? WHERE uid = ?",
                      [pic, uid],
                      function (err, results, fields) {
                        if (err) {
                          resp.send({ status: "error", message: err });
                          return;
                        } else {
                          connection.query(
                            "SELECT cid FROM users WHERE uid=?",
                            [uid],
                            function (err, results, fields) {
                              if (err) {
                                resp.json({ status: "error", message: err });
                                return;
                              } else {
                                resp.json(results);
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                } else {
                  connection.execute(
                    "INSERT INTO users (uid, pic_url, main) VALUES (?, ?, ?)",
                    [uid, pic, "Y"],
                    function (err, results, fields) {
                      if (err) {
                        resp.send({ status: "error", message: err });
                        return;
                      } else {
                        connection.query(
                          "SELECT cid, pic_url FROM users WHERE uid=?",
                          [uid],
                          function (err, results, fields) {
                            if (err) {
                              resp.json({ status: "error", message: err });
                              return;
                            } else {
                              resp.json(results);
                            }
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          });
      }
    });
});

app.post("/edituser", jsonParser, (req, res) => {
  const id = req.body.id;
  connection.query(
    `SELECT * FROM users WHERE id = ?`,
    [id],
    function (err, results, fields) {
      res.send(results);
    }
  );
});

app.post("/check_cid", jsonParser, function (req, resp, next) {
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            connection.query(
              "SELECT * FROM users WHERE uid=? AND main = 'Y'",
              [uid],
              function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                } else {
                  resp.json(results);
                }
              }
            );
          });
      }
    });
});

app.post("/register_user", jsonParser, function (req, resp, next) {
  const cid = req.body.idcard;
  const pname = req.body.pname;
  const fname = req.body.fname;
  const lname = req.body.lname;

  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            connection.execute(
              "UPDATE users SET cid=?, pname=?, fname=?, lname=? WHERE uid=?",
              [cid, pname, fname, lname, uid],
              function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                } else {
                  resp.json("done");
                }
              }
            );
          });
      }
    });
});

app.post("/register_user_other", jsonParser, function (req, resp, next) {
  const cid = req.body.idcard;
  const pname = req.body.pname;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const other = req.body.for;
  const type = req.body.type;

  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  connection.execute(
    "SELECT cid FROM users WHERE cid = ?",
    [cid],
    function (err, results, fields) {
      if (err) {
        resp.json({ status: "error", message: err });
        return;
      }
      if (results.length > 0) {
        resp.json({
          status: "error",
          message: "เลขบัตรประชาชนนี้ได้ลงทะเบียนไปแล้ว",
        });
      } else {
        axios
          .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
          .then((res) => {
            if (res.data.client_id === c_id && res.data.expires_in > 0) {
              axios
                .get(`https://api.line.me/v2/profile`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => {
                  const uid = res.data.userId;
                  connection.execute(
                    "INSERT INTO users (uid, related, cid, pname, fname, lname, main) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [uid, other, cid, pname, fname, lname, type],
                    function (err, results, fields) {
                      if (err) {
                        resp.json({ status: "error", message: err });
                        return;
                      } else {
                        resp.json("done");
                      }
                    }
                  );
                });
            }
          });
      }
    }
  );
});

app.put("/update_register_user_other", jsonParser, function (req, resp, next) {
  const id = req.body.id;
  const cid = req.body.idcard;
  const pname = req.body.pname;
  const fname = req.body.fname;
  const lname = req.body.lname;
  const other = req.body.for;

  connection.execute(
    "SELECT cid FROM users WHERE cid = ?",
    [cid],
    function (err, results, fields) {
      if (err) {
        resp.json({ status: "error", message: err });
        return;
      }
      if (results.length > 0) {
        resp.json({
          status: "error",
          message: "เลขบัตรประชาชนนี้ได้ลงทะเบียนไปแล้ว",
        });
      } else {
        connection.execute(
          `UPDATE users SET cid = ?, pname = ?, fname = ?, lname = ?, related = ?) 
          WHERE id = ?`,
          [cid, pname, fname, lname, other, id],
          function (err, results, fields) {
            if (err) {
              resp.status(500).json({ status: 500, message: err });
            } else {
              resp.status(200).send({
                status: 200,
                message: "Successfully Updated.",
              });
            }
          }
        );
      }
    }
  );
});

app.post("/register", jsonParser, function (req, res, next) {
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    var username = req.body.username;
    var fname = req.body.fname;
    var lname = req.body.lname;

    connection.execute(
      "INSERT INTO staff (username, password, fname, lname) VALUES (?, ?, ?, ?)",
      [username, hash, fname, lname],
      function (err, results, fields) {
        if (err) {
          res.json({ status: "error", message: err });
          return;
        }
        res.json({ status: "ok" });
      }
    );
  });
});

app.post("/login", jsonParser, function (req, res, next) {
  connection.execute(
    "SELECT * FROM staff WHERE username=?",
    [req.body.username],
    function (err, users, fields) {
      if (err) {
        res.json({ status: "error", message: err });
        return;
      }
      if (users.length == 0) {
        res.json({ status: "error", message: "no user found" });
        return;
      }
      bcrypt.compare(
        req.body.password,
        users[0].password,
        function (err, isLogin) {
          if (isLogin) {
            var token = jwt.sign(
              {
                username: users[0].username,
                name: users[0].fname + " " + users[0].lname,
              },
              secret,
              { expiresIn: "1h" }
            );
            res.json({ status: "ok", message: "success", token });
          } else {
            res.json({ status: "error", message: "failed" });
          }
        }
      );
    }
  );
});

app.get("/authen", jsonParser, function (req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, secret);
    res.json({ status: "ok", decoded });
  } catch (err) {
    res.json({ status: "error", message: err });
  }
});

app.get("/holiday", jsonParser, function (req, res, next) {
  connection.query(
    "SELECT date_holiday FROM holiday",
    function (err, results, fields) {
      if (err) {
        res.json({ status: "error", message: err });
        return;
      }
      res.json(results);
    }
  );
});

app.get("/checkdate", jsonParser, function (req, res, next) {
  connection.query(
    "SELECT booking_date FROM booking_list WHERE booking_status = 'Y' GROUP BY booking_date HAVING COUNT(booking_date) > 3",
    function (err, results, fields) {
      if (err) {
        res.json({ status: "error", message: err });
        return;
      }
      res.json(results);
    }
  );
});

app.post("/getdatauser", jsonParser, function (req, resp, next) {
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            connection.execute(
              `SELECT * 
              FROM users
              WHERE main = 'N' AND uid =  ?`,
              [uid],
              function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                }
                resp.json(results);
              }
            );
          });
      }
    });
});

app.post("/checkbooking", jsonParser, function (req, resp, next) {
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            connection.execute(
              `SELECT b.id, b.cid, CONCAT(u.pname,u.fname,' ',u.lname) as fullname, u.related, b.booking_service, b.booking_date,b.booking_time 
              FROM booking_list b
              LEFT JOIN users u ON u.cid = b.cid
              WHERE b.booking_status = 'Y' AND b.uid = ?`,
              [uid],
              function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                }
                resp.json(results);
              }
            );
          });
      }
    });
});

app.post("/checkbookingother", jsonParser, function (req, resp, next) {
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const cid = req.body.cid;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            connection.execute(
              `SELECT cid 
              FROM booking_list 
              WHERE booking_status = 'Y' AND uid = ? AND cid = ?`,
              [uid, cid],
              function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                }
                resp.json(results);
              }
            );
          });
      }
    });
});

app.post("/databooking", jsonParser, function (req, resp, next) {
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            connection.execute(
              `SELECT b.id, b.cid, CONCAT(u.pname,u.fname,' ',u.lname) as fullname, u.related, u.cid, b.booking_service, b.booking_date,b.booking_time,b.booking_status  
              FROM booking_list b
              LEFT JOIN users u ON u.cid = b.cid
              WHERE b.uid = ? ORDER BY b.id DESC`,
              [uid],
              function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                }
                resp.json(results);
              }
            );
          });
      }
    });
});

app.post("/checktime", jsonParser, function (req, res, next) {
  connection.query(
    "SELECT booking_time FROM booking_list WHERE booking_status='Y' AND booking_date=?",
    [req.body.date],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "error", message: err });
        return;
      }
      res.json(results);
    }
  );
});

app.put("/cancel_queue", jsonParser, function (req, resp, next) {
  const id = req.body.id;
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            connection.execute(
              `UPDATE booking_list SET booking_status = 'N' WHERE id = ?`,
              [id],
              async function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                } else {
                  let fullname = "";
                  let date = "";
                  let time = "";
                  let service = "";
                  connection.query(
                    `SELECT CONCAT(u.pname,u.fname,' ',u.lname) AS fullname, b.booking_date, b.booking_time, b.booking_service FROM booking_list b LEFT JOIN users u ON u.cid = b.cid WHERE b.id = ?`,
                    [id],
                    function (err, results, fields) {
                      fullname = results[0].fullname;
                      date = results[0].booking_date;
                      time = results[0].booking_time;
                      service = results[0].booking_service;

                      let data = JSON.stringify({
                        to: uid,
                        messages: [
                          {
                            type: "flex",
                            altText: "คุณได้ยกเลิกคิว",
                            contents: {
                              type: "bubble",
                              header: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                  {
                                    type: "text",
                                    text: "คุณได้ยกเลิกคิว",
                                    align: "center",
                                    weight: "bold",
                                    color: "#ffffff",
                                    size: "lg",
                                  },
                                ],
                                backgroundColor: "#FF2C2C",
                                paddingAll: "md",
                              },
                              body: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                  {
                                    type: "text",
                                    text: "ชื่อ " + fullname,
                                    weight: "bold",
                                    size: "lg",
                                    margin: "md",
                                    align: "center",
                                  },
                                  {
                                    type: "separator",
                                    margin: "xxl",
                                  },
                                  {
                                    type: "text",
                                    text:
                                      "วัน " +
                                      dayjs(date).format(
                                        "dddd ที่ D MMMM YYYY"
                                      ),
                                    weight: "bold",
                                    size: "lg",
                                    margin: "md",
                                    align: "center",
                                  },
                                  {
                                    type: "text",
                                    text: "เวลา " + time,
                                    size: "xl",
                                    wrap: true,
                                    weight: "bold",
                                    align: "center",
                                  },
                                  {
                                    type: "separator",
                                    margin: "xxl",
                                  },
                                  {
                                    type: "text",
                                    text: "บริการ " + service,
                                    size: "lg",
                                    weight: "bold",
                                    align: "center",
                                  },
                                ],
                              },
                              footer: {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                  {
                                    type: "text",
                                    text: "โรงพยาบาลปากพลี นครนายก",
                                    align: "center",
                                    color: "#ffffff",
                                  },
                                ],
                                backgroundColor: "#A22CFF",
                                paddingAll: "sm",
                              },
                              styles: {
                                footer: {
                                  separator: true,
                                },
                              },
                            },
                          },
                        ],
                      });
                      axios
                        .post("https://api.line.me/v2/bot/message/push", data, {
                          headers: {
                            Authorization: "Bearer " + process.env.KEY_API,
                            "Content-Type": "application/json",
                          },
                        })
                        .then(function (response) {
                          resp.json("done");
                        });
                    }
                  );
                }
              }
            );
          });
      }
    });
});

app.post("/submit", jsonParser, function (req, resp, next) {
  const cid = req.body.cid;
  const date = req.body.date;
  const dateTH = req.body.dateth;
  const time = req.body.time;
  const service = req.body.service;

  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            let fullname = "";
            connection.query(
              "SELECT CONCAT(pname,fname,' ',lname) as fullname FROM users WHERE cid = ?",
              [cid],
              function (err, results) {
                fullname = results[0].fullname;
              }
            );

            connection.query(
              "INSERT INTO booking_list (uid, cid, booking_date, booking_time, booking_service) VALUES (?, ?, ?, ?, ?)",
              [uid, cid, date, time, service],
              function (err, results) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                } else {
                  let data = JSON.stringify({
                    to: uid,
                    messages: [
                      {
                        type: "flex",
                        altText: "จองคิวสำเร็จ",
                        contents: {
                          type: "bubble",
                          header: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                              {
                                type: "text",
                                text: "คุณได้จองคิว",
                                align: "center",
                                weight: "bold",
                                color: "#ffffff",
                                size: "lg",
                              },
                            ],
                            backgroundColor: "#00B01D",
                            paddingAll: "md",
                          },
                          body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                              {
                                type: "text",
                                text: "ชื่อ " + fullname,
                                weight: "bold",
                                size: "lg",
                                margin: "md",
                                align: "center",
                              },
                              {
                                type: "separator",
                                margin: "xxl",
                              },
                              {
                                type: "text",
                                text: dateTH,
                                weight: "bold",
                                size: "lg",
                                margin: "md",
                                align: "center",
                              },
                              {
                                type: "text",
                                text: "เวลา " + time,
                                size: "xl",
                                wrap: true,
                                weight: "bold",
                                align: "center",
                              },
                              {
                                type: "separator",
                                margin: "xxl",
                              },
                              {
                                type: "text",
                                text: "บริการ " + service,
                                size: "lg",
                                weight: "bold",
                                align: "center",
                              },
                            ],
                          },
                          footer: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                              {
                                type: "text",
                                text: "โรงพยาบาลปากพลี นครนายก",
                                align: "center",
                                color: "#ffffff",
                              },
                            ],
                            backgroundColor: "#A22CFF",
                            paddingAll: "sm",
                          },
                          styles: {
                            footer: {
                              separator: true,
                            },
                          },
                        },
                      },
                    ],
                  });
                  axios
                    .post("https://api.line.me/v2/bot/message/push", data, {
                      headers: {
                        Authorization: "Bearer " + process.env.KEY_API,
                        "Content-Type": "application/json",
                      },
                    })
                    .then(function (response) {
                      resp.json("done");
                    })
                    .catch(function (error) {
                      console.log(error);
                    });
                }
              }
            );
          });
      }
    });
});

app.post("/line_liff_queue", jsonParser, function (req, resp, next) {
  const c_id = "1660743780";
  const actoken = req.body.actoken;
  const token = actoken.replace('"', "").replace('"', "");

  axios
    .get(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`)
    .then((res) => {
      if (res.data.client_id === c_id && res.data.expires_in > 0) {
        axios
          .get(`https://api.line.me/v2/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            const uid = res.data.userId;
            let fullname = "";
            connection.query(
              `SELECT CONCAT(u.pname,u.fname,' ',u.lname) AS fullname,b.booking_date,b.booking_time, b.booking_service FROM booking_list b 
              LEFT JOIN users u ON u.cid = b.cid
              WHERE b.uid = ? AND b.booking_status = 'Y'`,
              [uid],
              function (err, results, fields) {
                if (err) {
                  resp.json({ status: "error", message: err });
                  return;
                } else {
                  const bubbles = results.map((item) => ({
                    type: "bubble",
                    size: "micro",
                    hero: {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: item.fullname,
                          size: "sm",
                          weight: "bold",
                          align: "center",
                        },
                        {
                          type: "separator",
                        },
                        {
                          type: "text",
                          text: "จองคิวเมื่อ",
                          size: "xs",
                          align: "center",
                          color: "#03C988",
                        },
                        {
                          type: "text",
                          text: dayjs(item.booking_date).format("D MMMM YYYY"),
                          size: "sm",
                          weight: "bold",
                          align: "center",
                        },
                        {
                          type: "text",
                          text: item.booking_time + " น.",
                          size: "sm",
                          weight: "bold",
                          align: "center",
                        },
                        {
                          type: "separator",
                        },
                      ],
                      spacing: "sm",
                      margin: "none",
                      paddingTop: "lg",
                    },
                    body: {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: "บริการ",
                          size: "xs",
                          wrap: true,
                          align: "center",
                          color: "#03C988",
                        },
                        {
                          type: "text",
                          text: item.booking_service,
                          weight: "bold",
                          size: "sm",
                          wrap: true,
                          align: "center",
                        },
                      ],
                      spacing: "sm",
                      paddingAll: "13px",
                    },
                  }));

                  let data = JSON.stringify({
                    to: uid,
                    messages: [
                      {
                        type: "flex",
                        altText: "รายละเอียดการจองคิว",
                        contents: {
                          type: "carousel",
                          contents: bubbles,
                        },
                      },
                    ],
                  });
                  axios
                    .post("https://api.line.me/v2/bot/message/push", data, {
                      headers: {
                        Authorization: "Bearer " + process.env.KEY_API,
                        "Content-Type": "application/json",
                      },
                    })
                    .then(function (response) {
                      resp.json("done");
                    })
                    .catch(function (error) {
                      console.log(error);
                    });
                }
              }
            );
          });
      }
    });
});

app.listen(3333, function () {
  console.log("CORS-enabled web server listening on port 3333");
});
