import User from "../models/User.js"
import { getChatModel, getOpenAI } from "../configs/openai.js"

export const RESPONSE_STYLE_INSTRUCTIONS =
  "You are BlueShark, a helpful assistant. Match the language of the user's latest message, including voice transcriptions; do not default to the language of earlier turns. For English, reply naturally in English without switching to Hindi. For Hinglish (Hindi mixed with English, including Hindi written in Latin/Roman letters), reply naturally in Roman-script Hinglish, matching the user's mix without translating it into formal English or Devanagari Hindi. For Hindi written in Devanagari, reply in Devanagari. Follow any explicit language or script request from the user."

export const validateImageData = (imageFiles) => {
  for (const image of imageFiles) {
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      image.dataUrl || ""
    )
    if (!match) {
      return "Unsupported or missing image data. Capture the image again."
    }
    if (image.type !== `image/${match[1]}`) {
      return "Image type does not match the captured image data."
    }
  }
  return null
}

export const resetFreeImageUsage = async (userId) => {
  const now = new Date()
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  )

  await User.updateOne(
    {
      _id: userId,
      $or: [
        { imageUsagePeriodStart: null },
        { imageUsagePeriodStart: { $lt: monthStart } },
      ],
    },
    {
      $set: {
        imageUsagePeriodStart: monthStart,
        imageUploadsThisPeriod: 0,
      },
    }
  )

  return User.findById(userId)
}

export const reserveMessageCredits = async ({
  userId,
  plan,
  creditCost,
  imageFiles,
}) => {
  const reservationFilter = {
    _id: userId,
    credits: { $gte: creditCost },
  }
  if (plan._id !== "free") {
    reservationFilter.subscriptionStatus = { $in: ["active", "trialing"] }
  }
  if (imageFiles.length > 0) {
    reservationFilter.$and = [
      {
        $or: [
          {
            imageUploadsThisPeriod: {
              $lte: plan.monthlyImageLimit - imageFiles.length,
            },
          },
          { imageUploadsThisPeriod: { $exists: false } },
        ],
      },
    ]
    if (plan._id === "free") {
      const now = new Date()
      reservationFilter.imageUsagePeriodStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      )
    }
  }

  return User.findOneAndUpdate(
    reservationFilter,
    {
      $inc: {
        credits: -creditCost,
        imageUploadsThisPeriod: imageFiles.length,
      },
    },
    { new: true }
  )
}

export const prepareMessageContent = (files, text) => {
  const savedAttachments = files.map((file) => ({
    name: String(file.name || "file").slice(0, 200),
    type: String(file.type || ""),
    text: typeof file.text === "string" ? file.text.slice(0, 20000) : "",
  }))

  const promptParts = [text]
  for (const file of savedAttachments) {
    if (file.text) promptParts.push(`File: ${file.name}\n${file.text}`)
    else promptParts.push(`Attached file: ${file.name}`)
  }

  return {
    savedAttachments,
    modelText: promptParts.filter(Boolean).join("\n\n") || "Look at the attached files.",
  }
}

export const getAssistantReply = async ({
  provider,
  modelText,
  imageFiles,
  onChunk,
}) => {
  const openai = getOpenAI(provider)
  const messageContent = [
    { type: "text", text: modelText },
    ...imageFiles.map((image) => ({
      type: "image_url",
      image_url: { url: image.dataUrl },
    })),
  ]
  const stream = await openai.chat.completions.create({
    model: getChatModel(provider),
    messages: [
      {
        role: "system",
        content: RESPONSE_STYLE_INSTRUCTIONS,
      },
      {
        role: "user",
        content: imageFiles.length > 0 ? messageContent : modelText,
      },
    ],
    stream: true,
  })

  let replyContent = ""
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      replyContent += content
      onChunk(content)
    }
  }

  return replyContent
}

export const countImages = (attachments) =>
  Array.isArray(attachments)
    ? attachments.filter((file) =>
        String(file.type || "").startsWith("image/")
      ).length
    : 0

export const filesCreditCost = (attachments) =>
  Array.isArray(attachments) && attachments.length > 0 ? 2 : 1
