import OpenAI from "openai"

const clients = new Map()

// Provider settings
const getProviderConfig = (provider) => {
  if (provider === "groq") {
    if (!process.env.GROQ_API_KEY) {
      const error = new Error(
        "Groq is not configured. Add GROQ_API_KEY to backend/.env and restart the backend."
      )
      error.statusCode = 503
      throw error
    }

    return {
      apiKey: process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    }
  }

  if (provider !== "gemini") {
    const error = new Error("Unsupported AI provider. Choose Gemini or Groq.")
    error.statusCode = 400
    throw error
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    const error = new Error(
      "Set GEMINI_API_KEY or OPENAI_API_KEY in the backend .env file"
    )
    error.statusCode = 503
    throw error
  }

  return {
    apiKey,
    baseURL:
      process.env.OPENAI_BASE_URL ||
      (process.env.GEMINI_API_KEY
        ? "https://generativelanguage.googleapis.com/v1beta/openai/"
        : undefined),
    model:
      process.env.OPENAI_MODEL ||
      (process.env.GEMINI_API_KEY ? "gemini-3.5-flash-lite" : "gpt-4o-mini"),
  }
}

export const getOpenAI = (provider = "gemini") => {
  // Reuse client
  if (!clients.has(provider)) {
    const { apiKey, baseURL } = getProviderConfig(provider)
    clients.set(provider, new OpenAI({ apiKey, baseURL }))
  }

  return clients.get(provider)
}

export const getChatModel = (provider = "gemini") =>
  getProviderConfig(provider).model
