import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    startStation: {
        type: String,
        required: true
    },
    endStation: {
        type: String,
        required: true
    },
    region: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    distance: {
        type: Number,
        required: true
    },
    operatingMonths: {
        type: [Number],
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    highlights: {
        type: [String],
        required: false
    },
    bestSeason: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false,
        trim: true,
    },
  },
  {
    timestamps: true
  }
);

const trip = mongoose.model("Trip", tripSchema);

export default trip;