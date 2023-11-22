const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('C:\\Users\\Workplace\\Desktop\\aims\\database\\aims-db.db');

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get('/batch', (req, res) => {
    db.all('SELECT * FROM Batch', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});


app.get('/posts', (req, res) => {
    db.all('SELECT * FROM Posts', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});


app.get('/sections', (req, res) => {
    db.all('SELECT * FROM Sections', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});

app.get('/strands', (req, res) => {
    db.all('SELECT * FROM Strands', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});


app.get('/users', (req, res) => {
    db.all('SELECT * FROM User', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});

app.get('/user-types', (req, res) => {
    db.all('SELECT * FROM UserType', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});

app.get('/image-attributes', (req, res) => {
    db.all('SELECT * FROM ImageAttributes', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});

app.get('/images', (req, res) => {
    db.all('SELECT * FROM Images', (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
        res.json(rows);
    });
});
module.exports = app;

