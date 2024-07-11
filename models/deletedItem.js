const mongoose = require("mongoose");


const item = new mongoose.Schema({
  menuId: String,
  qty: Number,
  menuName: String,
  menuPrice: Number
})

const deletedOrder = new mongoose.Schema({
  restId: Number,
  tableNumber: Number,
  items: [item], 
  is_complete: Boolean,
  totalPayable: Number
});

const   deleteItem = mongoose.model('deleteItem', deletedOrder);

module.exports = deleteItem;