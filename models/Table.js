// models/Table.js
const mongoose = require('mongoose');



const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true },
});

// const Table = mongoose.model('Table', tableSchema);

module.exports = tableSchema;
