// imports

const express = require('express'),
      mongoose = require('mongoose'),
      findOrCreate = require('mongoose-findorcreate'),
      passport = require('passport'),
      session = require('express-session'),
      FacebookStrategy = require('passport-facebook'),
      app = express(),
      expressLayouts = require('express-ejs-layouts'),
      httpServer = require('http').createServer(app),
      WebSocket = require('ws'),
      server = new WebSocket.Server({ server: httpServer })

server.on('connection', socket => {
  socket.on('message', message => {
    server.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`${ message }`)
      }
    })
  })
})

// express settings
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout', 'layout')
app.use(expressLayouts)
app.use(express.static(__dirname + '/public'))
app.use(express.urlencoded({
  extended: false
}))
app.use(session({
  secret: 'pxl8',
  resave: true,
  saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session())

// database
mongoose.connect(process.env.MONGOOSE_URI).then(() => {
  httpServer.listen(process.env.PORT)
})

const userSchema = new mongoose.Schema({
  facebookId: String,
  first_name: String,
  last_name: String,
  image: String,
  email: String,
  friends: Number
})

const chatSchema = new mongoose.Schema({
  facebookId: String,
  first_name: String,
  message: String
})

userSchema.plugin(findOrCreate)
const User = new mongoose.model('user', userSchema)
const Chat = new mongoose.model('chat', chatSchema)

// passport serialize/deserialize

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user)
  })
})

// facebook authentication
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: "https://chat-chat-chat-p.herokuapp.com/login/facebook/pxl8",
    profileFields: ['id', 'first_name', 'last_name', 'email', 'picture.type(large)', 'friends']
  }, (accessToken, refreshToken, profile, cb) => {
    User.findOrCreate({
      first_name: profile._json.first_name,
      last_name: profile._json.last_name,
      image: profile.photos[0].value,
      friends: profile._json.friends.summary.total_count,
      email: profile._json.email,
      facebookId: profile.id
    }, function (err, user) {
      return cb(err, user)
    })
  }
))

app.get('/login/facebook', passport.authenticate('facebook', {
  scope: ['user_friends']
}))

app.get('/login/facebook/pxl8',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/chat')
})

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/chat', isAuthorized, (req, res) => {
  res.render('chat', {
    user: req.user
  })
})

app.post('/chat', isAuthorized, async (req, res) => {
  const message = req.body.message
  if (message.replace(/\s/g, '').length == 0) return res.send({ success: false })
  const newChat = new Chat({
    facebookId: req.user.facebookId,
    first_name: req.user.first_name,
    message: req.body.message
  })

  await newChat.save()
  res.send({ success: true })
})

app.get('/messages', isAuthorized, async (req, res) => {
  await Chat.find().then(result => {
    res.send(result)
  })
})

function isAuthorized(req, res, next) {
  if (req.isAuthenticated()) return next()
  res.redirect('/')
}
