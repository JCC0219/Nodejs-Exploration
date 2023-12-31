// const http = require("http");

const path = require("path");
const fs = require("fs");
const https = require("https");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session); // pass session arguments from previous import
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const errorController = require("./controllers/error");

const User = require("./models/user");

console.log(process.env.MONGO_USER);

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.v1voybz.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`;
//do this before route handling
const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});
const csrfProtection = csrf();

const privateKey = fs.readFileSync("server.key");
const certificate = fs.readFileSync("server.cert");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // cb(null, new Date().toISOString() + '-' + file.originalname);

    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//to tell node to find which engine to use it
app.set("view engine", "ejs"); // ejs
// implements on view
app.set("views", "views");

app.use(
  helmet.contentSecurityPolicy({
      directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'", 'js.stripe.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
          'frame-src': ["'self'", 'js.stripe.com'],
          'font-src': ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com']
      },
  })
)
app.use(compression());
//write log requests into a log file
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);
app.use(morgan("combined", { stream: accessLogStream }));

//parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use(express.static(path.join(__dirname, "public"))); // to make dir accessible to user
app.use("/images", express.static(path.join(__dirname, "images"))); // to make images dir accessible to user
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
app.use(csrfProtection);
app.use(flash());

//res.locals.to set a common attribute in every res.render
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
//Mongoose store does not have the methods in mangoose model!!,
//so we cannot directly use req.session.user to trigger save() find() AnyMethodInModel() method that provided by mongoose model
//please reinitialize this to take back the mangoose model
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

//request data should be put on top to make it runs everytime a request is comming,
// req.data is independent data for each request

//top down structure
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);

app.use(errorController.get404);

// mongoConnect(() => {
//   app.listen(3000);
// });

//error handling middleware
app.use((error, req, res, next) => {
  console.log(error);
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    // isAuthenticated: req.session.isLoggedIn,
  });
});

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    console.log("connected to DB");
    // https
    //   .createServer({ key: privateKey, cert: certificate }, app)
    //   .listen(process.env.PORT || 3000);
      app.listen(process.env.PORT || 3000);

  })
  .catch((err) => console.log(err));
