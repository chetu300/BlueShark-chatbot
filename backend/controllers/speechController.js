import { toFile } from "openai"
import { getOpenAI } from "../configs/openai.js"
import { getCreditPlan } from "../configs/creditPlans.js"

const getAudioExtension = (contentType) => {
  // Match the file type to the audio.
  const extensions = {
    "audio/flac": "flac",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/x-wav": "wav",
  }
  return extensions[contentType] || "webm"
}

export const transcribeAudioController = async (req, res) => {
  const plan = getCreditPlan(req.user.planId)
  if (
    (plan._id !== "free" &&
      !["active", "trialing"].includes(req.user.subscriptionStatus)) ||
    req.user.credits < 1
  ) {
    return res.status(402).json({
      success: false,
      message: "Your plan has no available chat credits. Renew or upgrade to continue.",
    })
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No audio was received. Record your voice and try again.",
    })
  }

  const contentType = req.headers["content-type"]?.split(";")[0].trim()
  if (!contentType?.startsWith("audio/")) {
    return res.status(415).json({
      success: false,
      message: "Unsupported audio format. Record your voice and try again.",
    })
  }

  try {
    const audioFile = await toFile(
      req.body,
      `voice.${getAudioExtension(contentType)}`,
      { type: contentType }
    )
    const transcription = await getOpenAI("groq").audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      prompt:
        "The speaker may speak English or Hinglish (Hindi mixed with English). " +
        "Detect which language they speak. Transcribe fully English speech in English. " +
        "For Hinglish, preserve the Hindi-English mix, writing Hindi words in Latin script " +
        "and keeping English words in English. Do not translate or change the language.",
      response_format: "json",
    })

    res.json({ success: true, text: transcription.text.trim() })
  } catch (error) {
    res.status(error.statusCode || error.status || 502).json({
      success: false,
      message: error.message || "Voice transcription failed. Please try again.",
    })
  }
}
