const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    const isSrv = typeof uri === "string" && uri.startsWith("mongodb+srv://");

    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    // Atlas/SRV requires TLS and supports Server API options.
    if (isSrv) {
      options.serverApi = {
        version: "1",
        strict: true,
        deprecationErrors: true,
      };
      options.tls = true;
      options.tlsAllowInvalidCertificates = false;
    }

    await mongoose.connect(uri, options);
    console.log("MongoDB Atlas Connected ✓");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
