// const http = require("http");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const adminData = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const expressHbs = require('express-handlebars');


//do this before route handling
const app = express();

// register handlebars as engine
app.engine('hbs', expressHbs.engine({ layoutsDir: "views/layouts/", defaultLayout: 'main-layout', extname: 'hbs' })); //hbs


//to tell node to find which engine to use it
// app.set("view engine", "pug"); // pug
app.set("view engine", "hbs"); // handlebar

// implements on view
app.set("views", "views");

//parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public"))); // to make the dir accessible to user

//top down structure
app.use("/admin", adminData.routes);
app.use(shopRoutes);

app.use((req, res, next) => {
  // res.status(404).sendFile(path.join(__dirname, "views", "404.html")); //HTML
  res.status(404).render("404", {pageTitle: "Page Not Found" }); //pug
});

// const server = http.createServer(app);
// server.listen(3000);
//or
app.listen(3000);
