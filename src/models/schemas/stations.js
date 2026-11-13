import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Changed from stationId to id
  name: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true }
});

const Station = mongoose.model('Station', stationSchema);

export default Station;