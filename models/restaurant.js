// models/Restaurant.js
const mongoose = require("mongoose");
const tableSchema = require("./Table");
const menuSchema = require("./MenuItem");




  
  
  
  
// Define the restaurant schema
const restaurantSchema = new mongoose.Schema({
    restId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    tables: [tableSchema],
    menu: [menuSchema],
});

// Create the Restaurant model
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// Export the Restaurant model
module.exports = Restaurant;
