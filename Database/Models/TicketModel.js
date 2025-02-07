const mongoose = require("mongoose");
const ticketSchema = new mongoose.Schema({
  OtelName: {
    type: String,
    required: true,
  },
  OtelTel: {
    type: String,
    required: true,
  },
  itemList: {
    type: [Object],
    required: true,
  },
  employeeName: {
    type: String,
  },
  emplooyeEmail:{
    type: String,
  },
  Date: {
    type: Date,
  },
  Notes: {
    type: String,
  },
  file: {
    type: String,
  },
  customerId: {
    type: String,
    required: true,
    unique: true,
  }
});


const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;