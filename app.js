const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const User = require('./models/user');
const Message = require('./models/message');
const http = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');

const sessionStore = MongoStore.create({
  mongoUrl: 'mongodb://localhost:27017/myapp',
  mongooseConnection: mongoose.connection,
  collectionName: 'sessions'
});

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(session({
  secret: 'myKey',
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}));

app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/myapp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });


app.use('/auth', authRoutes);

const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    res.redirect('/auth/login');
  } else {
    next();
  }
};


let onlineUsers = [];
app.get('/chat', requireLogin, async (req, res) => {
  try {
    if (req.session.user) {
      req.session.user.online = true; 
      if (!onlineUsers.includes(req.session.user.username)) {
        onlineUsers.push(req.session.user.username);
      }
      console.log("Online Users:", onlineUsers);
    }
    const userId = req.session.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    req.session.user = user;

    res.render('chat', { user });
  } catch (error) {
    console.error('Error retrieving user data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    req.session.user = user;

    res.render('dashboard', { user });
  } catch (error) {
    console.error('Error retrieving user data:', error);
    res.status(500).send('Internal Server Error');
  }
});

io.on('connection', (socket) => {
  socket.on('message', async (data) => {
    console.log('Message received:', data);
    const newMessage = new Message(data);
    await newMessage.save();
    io.emit('message', data);
  });
});

app.put('/update-goal', async (req, res) => {
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

app.get('/', (req, res) => {
  res.render('home', { user: req.session.user });
});

app.get('/auth/logout', (req, res) => {

  const username = req.session.user.username;
  onlineUsers = onlineUsers.filter(user => user !== username);
  console.log(`${username} logged out.`);
  console.log("Online Users:", onlineUsers);

  req.session.destroy();
  res.redirect('/');
});

app.set('view engine', 'ejs');
app.set('views', './views');

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
