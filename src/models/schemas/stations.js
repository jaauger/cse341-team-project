import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    prefecture: {
        type: String,
        required: true
    },
    region: {
        type: String,
        required: true
    },
    facilities: {
        type: [String],
        required: true
    },
    description: {
        type: String,
        required: true
    }
});

const Station = mongoose.model('Station', stationSchema, 'stations');

export default Station;