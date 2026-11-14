import Station from './schemas/stations.js';

const getAllStations = async () => {
  return await Station.find({});
};

const getStationById = async (requestedId) => {
  // Changed to query by 'id' instead of 'stationId'
  return await Station.findOne({ id: requestedId });
};

export { getAllStations, getStationById };