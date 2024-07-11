const mongoose = require("mongoose");
// require("dotenv").config();

// console.log("Database URL from .env file: ", process.env.DATABASE);

// const db = process.env.DATABASE;

const db =
  "mongodb+srv://rajbodar720:raj123@cluster0.vysikqh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(db)
  .then(() => console.log("Connection to Database successfully done!"))
  .catch((error) => console.log("Error: " + error.message));
