const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username, password });
    if (user) {
      req.session.user = user;
      res.redirect('/dashboard');
    } else {
      req.session.loginAttemptFailed = true;
      res.render('login', { loginAttemptFailed: req.session.loginAttemptFailed });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send('Username already exists');
    }

    const newUser = new User({ username, password });
    await newUser.save();
    res.send('Registration successful');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

router.put('/update-goal', async (req, res) => {
  try {
    const { goal } = req.body;

    if (!req.session.user) {
      return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.goal = goal;
    await user.save();
    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
