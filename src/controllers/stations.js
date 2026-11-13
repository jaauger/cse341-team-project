import {
  getAllStations as getAllStationsFromDb,
  getStationById as getStationByIdFromDb
} from '../models/stations.js';

const getAllStations = async (req, res) => {
  try {
    const stations = await getAllStationsFromDb();
    return res.status(200).json(stations);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getStationById = async (req, res) => {
  try {
    const { id } = req.params;
    const station = await getStationByIdFromDb(id);

    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }

    return res.status(200).json(station);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export { getAllStations, getStationById };