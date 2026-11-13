import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        unique: true
    },

    tripId: {
        type: String,
        required: true
    },

    departureTime: {
        type: String,
        required: true
    },

    arrivalTime: {
        type: String,
        required: true
    },

    daysOfWeek: {
        type: [String],
        required: true
    },

    status: {
        type: Boolean,
        required: true
    }
});

const Schedule = mongoose.model('Schedule', scheduleSchema, 'schedules');

export default Schedule;