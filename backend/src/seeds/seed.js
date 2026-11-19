const dotenv = require("dotenv");
const connectDB = require("../config/db");
const seedPermissions = require("./permissions.seed");
const seedRoles = require("./roles.seed");

dotenv.config();

const runSeed = async () => {
  try {
    await connectDB();

    await seedPermissions();
    await seedRoles();

    console.log("Database seeding completed successfully");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();