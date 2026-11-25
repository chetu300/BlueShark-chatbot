import mongoose from "mongoose"

const connectDB = async () => {
  try {
    // mongoose.connection.on("connected", () => console.log("Database connected"))
    // Get the database URL.
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL
    if (!mongoUri) {
      throw new Error("Set MONGO_URI or DATABASE_URL in the backend .env file")
    }
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    console.log("MongoDB connected successfully")
  } catch (err) {
    console.error("MongoDB connection error:", err)
    throw err
  }
}

export default connectDB
