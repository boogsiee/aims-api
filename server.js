const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();


app.use(cors());
app.use(bodyParser.json());


const isAuthenticated = (req, res, next) => {
    if (req.body.loggedIn) {
    next();
    } else {
    res.status(401).json({ error: 'Unauthorized' }); 
    }
};

// Create a SQLite database connection
const db = new sqlite3.Database('aims-db.db');

app.post('/signup', (req, res) => {
    const { username, password, user_type_role } = req.body;
    const checkUserQuery = 'SELECT * FROM User WHERE username = ?';
    db.get(checkUserQuery, [username], (err, existingUser) => {
        if (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
        return;
        }
        if (existingUser) {
        res.status(400).json({ error: 'Username already taken' });
        } else {
        const insertUserQuery = 'INSERT INTO User (username, password, user_type_role) VALUES (?, ?, ?)';
        db.run(insertUserQuery, [username, password, user_type_role], (err) => {
            if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
            return;
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
        }
    });
});


app.post('/', (req, res) => {
    const { password, username} = req.body;

const user = null;

    if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
    }

    if (user.username !== username) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    
    if (user.password !== password) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
    }

const userType = null;


    if (userType && userType.user_type_role === 'admin') {
    // Admin user, grant access
    res.json({ message: 'Admin user authenticated', role: 'admin' });
} else {
    // Non-admin user, check if registered
    if (user.registered) {
      // Registered user, grant access
    res.json({ message: 'Registered user authenticated', role: 'alumna' });
    } else {
      // Non-registered user
    res.status(403).json({ error: 'Access denied. User not registered' });
    }
}
});
app.get('/home', isAuthenticated, (req, res) => {
  // Only authenticated users will reach this point
res.json({ message: 'Welcome to the home page!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
