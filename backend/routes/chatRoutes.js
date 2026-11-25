import express from "express"
import {
  createChat,
  deleteChat,
  getChats,
} from "../controllers/chatController.js"
import { protect } from "./../middlewares/auth.js"
const chatRouter = express.Router()

// Create a chat
chatRouter.get("/create", protect, createChat)

// Get all chats
chatRouter.get("/getchats", protect, getChats)

// Delete a chat
chatRouter.post("/delete", protect, deleteChat)

export default chatRouter
