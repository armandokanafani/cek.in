const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");

const express = require('express');
const mysql = require('mysql')
const cors = require('cors')

const app = express();

app.use(cors({origin: true}));

const connection = mysql.createConnection({
    host: '34.101.55.63',
    user: 'root',
    password: '123',
    database: 'stock_data',
  });
  
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return;
    }
    console.log('Connected to database');
  });
  
  
  app.get('/data/:platform', (req, res) => {
    const platform = req.params.platform;
  
    
    const sql = 'SELECT * FROM platform WHERE platform = ?';
    connection.query(sql, [platform], (err, results) => {
      if (err) {
        console.error('Error querying database:', err);
        res.status(500).json({ error: 'Error querying database' });
        return;
      }
  
      
      res.json(results);
    });
  });
  
  exports.app = functions.region('asia-southeast2').https.onRequest(app)
  