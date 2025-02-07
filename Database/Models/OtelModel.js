const mongoose = require("mongoose");
const otelSchema = new mongoose.Schema({
    OtelName: {
      type: String,
      required: true,
      unique: true,
    },
    OtelAdress:{
      type: String,
      required: true,
      unique: true,
    },
    OtelTel:{
      type: String,
      required: true,
    },
    OtelNumber:{
      type: Number,
      required: true,
      unique: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    priceList:{
        type: Object,
    }
  });
  
  const Otel = mongoose.model('Otel', otelSchema);
  module.exports = Otel