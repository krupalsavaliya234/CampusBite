  const mongoose = require('mongoose');


  




  const item = new mongoose.Schema({
    menuId: String,
    qty: Number,
    menuName: String,
    menuPrice: Number
  })

  const orderSchema = new mongoose.Schema({
    restId: Number,
    tableNumber: Number,
    items: [item], 
    is_complete: Boolean,
    totalPayable: Number
  });

  const Order = mongoose.model('Order', orderSchema);

  module.exports = Order; 