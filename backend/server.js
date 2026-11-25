import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import connectDB from "./configs/db.js"
import userRouter from "./routes/userRoutes.js"
import chatRouter from "./routes/chatRoutes.js"
import messageRouter from "./routes/messageRouts.js"
import creditRouter from "./routes/creditRoutes.js"

import { stripeWebhooks } from "./controllers/webhooks.js"

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), ".env") })

//app initialization
const app = express()

// Stripe needs the original request body.

app.post(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks
)

//connect to database
await connectDB()

//portv
const PORT = process.env.PORT || 3000

//accept frontend requests
app.use(cors())

//body parser middleware for accepting json data

// Parse JSON for other routes.
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe") {
    next()
  } else {
    express.json({ limit: "20mb" })(req, res, next)
  }
})

//routes
app.get("/", (req, res) => {
  res.send("Hello, World!")
})
//user route
app.use("/api/user", userRouter)

//chat route
app.use("/api/chat", chatRouter)

//message route
app.use("/api/message", messageRouter)

// credit routs
app.use("/api/credit", creditRouter)

export default app

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}
