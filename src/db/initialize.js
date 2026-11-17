import trips from './seeds/trips.json' with { type: 'json' };
import schedules from './seeds/schedules.json' with { type: 'json' };
import stations from './seeds/stations.json' with { type: 'json' };
import ticketClasses from './seeds/ticket-classes.json' with { type: 'json' };
import trains from './seeds/trains.json' with { type: 'json' };

const starterCollections = [
  ['trips', trips],
  ['schedules', schedules],
  ['stations', stations],
  ['ticketClasses', ticketClasses],
  ['trains', trains]
];

const initializeDatabase = async (db) => {
  if (!db) {
    throw new Error('A database connection is required to initialize data.');
  }

  for (const [collectionName, documents] of starterCollections) {
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    await collection.insertMany(documents);
  }

  /*
   * PLAIN ENGLISH: Empty the bookings collection and make sure no two
   *   bookings can share the same confirmation code.
   * LOGIC: deleteMany({}) removes every booking. createIndex({ id: 1 },
   *   { unique: true }) tells MongoDB to reject a booking whose id is
   *   already used.
   * WHY WE NEED IT: The Bookings feature (issue #16) renamed the
   *   "confirmations" collection to "bookings." This reset now clears the
   *   new place where bookings are saved.
   * LEARNING GAP: Bookings are not in starterCollections above because
   *   there is no bookings seed file. Bookings always start empty and are
   *   only created when someone books a trip.
   */
  const bookings = db.collection('bookings');
  await bookings.deleteMany({});
  await bookings.createIndex({ id: 1 }, { unique: true });
};

export { initializeDatabase, starterCollections };
