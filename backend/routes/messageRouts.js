import express from "express"
import { protect } from "../middlewares/auth.js"
import { textMessageController } from "../controllers/messageController.js"
import { transcribeAudioController } from "../controllers/speechController.js"

const messageRouter = express.Router()

// Text and voice routes.
messageRouter.post("/text", protect, textMessageController)
messageRouter.post(
  "/transcribe",
  protect,
  express.raw({ type: "audio/*", limit: "10mb" }),
  transcribeAudioController
)

export default messageRouter
