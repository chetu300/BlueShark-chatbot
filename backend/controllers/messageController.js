//text based ai chat message controller

import Chat from "../models/Chat.js"
import User from "../models/User.js"
import { getCreditPlan } from "../configs/creditPlans.js"
import {
  countImages,
  filesCreditCost,
  getAssistantReply,
  prepareMessageContent,
  resetFreeImageUsage,
  reserveMessageCredits,
  validateImageData,
} from "./messageHelpers.js"

export const textMessageController = async (req, res) => {
  const timestamp = Date.now()
  let responseStarted = false
  let reservation
  try {
    const userId = req.user._id

    const { chatId, prompt, attachments = [], provider = "gemini" } = req.body
    if (provider !== "gemini" && provider !== "groq") {
      return res.status(400).json({
        success: false,
        message: "Unsupported AI provider. Choose Gemini or Groq.",
      })
    }

    if (!Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: "Attachments must be sent as a list.",
      })
    }

    const files = attachments
    const text = typeof prompt === "string" ? prompt.trim() : ""
    const plan = getCreditPlan(req.user.planId)
    const imageFiles = files.filter((file) =>
      String(file.type || "").startsWith("image/")
    )

    if (!text && files.length === 0) {
      return res.json({ success: false, message: "Message is empty" })
    }

    if (imageFiles.length > 0 && provider !== "gemini") {
      return res.status(400).json({
        success: false,
        message: "Image messages require Gemini. Switch the provider to Gemini and try again.",
      })
    }

    if (files.length > plan.maxAttachments) {
      return res.status(413).json({
        success: false,
        message: `${plan.name} allows up to ${plan.maxAttachments} attachment${plan.maxAttachments === 1 ? "" : "s"} per message.`,
      })
    }

    if (
      plan._id !== "free" &&
      !["active", "trialing"].includes(req.user.subscriptionStatus)
    ) {
      return res.status(402).json({
        success: false,
        message: "Your subscription is not active. Choose a plan to continue.",
      })
    }

    const imageError = validateImageData(imageFiles)
    if (imageError) {
      return res.status(400).json({ success: false, message: imageError })
    }

    if (imageFiles.length > 0) {
      if (plan._id === "free") {
        req.user = await resetFreeImageUsage(userId)
      }

      const currentUsage = Number(req.user.imageUploadsThisPeriod || 0)
      if (currentUsage + imageFiles.length > plan.monthlyImageLimit) {
        return res.status(429).json({
          success: false,
          message: `You've reached the ${plan.name} monthly image limit (${plan.monthlyImageLimit}). Upgrade your plan or wait for renewal.`,
        })
      }
    }

    const chat = await Chat.findOne({ userId, _id: chatId })
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" })
    }

    const creditCost = files.length ? 2 : 1
    if (req.user.credits < creditCost) {
      return res.status(402).json({
        success: false,
        message: "You don't have enough credits. Renew or upgrade your plan to continue.",
      })
    }

    // Check limits and save credits.
    reservation = await reserveMessageCredits({
      userId,
      plan,
      creditCost,
      imageFiles,
    })
    if (!reservation) {
      return res.status(409).json({
        success: false,
        message:
          "Your plan limit or credit balance changed. Refresh your account and try again.",
      })
    }

    const { savedAttachments, modelText } = prepareMessageContent(files, text)

    chat.messages.push({
      role: "user",
      content: text || savedAttachments.map((file) => file.name).join(", "),
      timestamp,
      attachments: savedAttachments,
    })

    res.status(200).type("application/x-ndjson")
    responseStarted = true

    const replyContent = await getAssistantReply({
      provider,
      modelText,
      imageFiles,
      onChunk: (content) => res.write(`${JSON.stringify({ content })}\n`),
    })

    const reply = {
      role: "assistant",
      content: replyContent,
      timestamp,
    }

    chat.messages.push(reply)
    await chat.save()

    res.end(
      `${JSON.stringify({
        done: true,
        reply,
        usage: {
          credits: reservation.credits,
          imageUploadsThisPeriod: reservation.imageUploadsThisPeriod,
          imageUsagePeriodStart: reservation.imageUsagePeriodStart,
        },
      })}\n`
    )
  } catch (error) {
    if (reservation) {
      await User.updateOne(
        { _id: req.user._id },
        {
          $inc: {
            credits: filesCreditCost(req.body.attachments),
            imageUploadsThisPeriod: -countImages(req.body.attachments),
          },
        }
      )
    }
    if (responseStarted) {
      res.end(`${JSON.stringify({ error: error.message })}\n`)
    } else {
      res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message })
    }
  }
}
