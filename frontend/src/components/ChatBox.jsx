import React, { useState, useEffect, useRef } from "react"
import { useAppContext } from "../context/AppContext"
import Message from "./Message"
import VoiceChatControl from "./VoiceChatControl"
import AttachMenu from "./AttachMenu"
import AttachmentPreview from "./attachment/AttachmentPreview"
import AIProviderSelect from "./AIProviderSelect"
import { assets } from "../assets/assets"
import toast from "react-hot-toast"
import { getCreditPlan, getImageUploadsUsed } from "../config/creditPlans"

function ChatBox() {
  const { selectedChat, user, axios, setUser, token, demoMode } =
    useAppContext()

  const promptRef = useRef(null)
  const bottomRef = useRef(null)
  const filesRef = useRef([])

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [aiProvider, setAiProvider] = useState(
    () => (localStorage.getItem("aiProvider") === "groq" ? "groq" : "gemini")
  )
  const [listening, setListening] = useState(false)
  const voiceRef = useRef(null)
  const [files, setFiles] = useState([])

  filesRef.current = files
  const plan = getCreditPlan(user?.planId)
  const imagesAttached = files.filter((file) => file.type.startsWith("image/")).length
  const imageUploadsRemaining = Math.max(
    0,
    plan.monthlyImageLimit - getImageUploadsUsed(user) - imagesAttached
  )
  const sendDisabled =
    loading || listening || (!prompt.trim() && files.length === 0)

  useEffect(() => {
    const textarea = promptRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    const maxHeight = 144
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden"
  }, [prompt])

  async function sendMessage(text) {
    const trimmed = text.trim()
    const filesToSend = filesRef.current
    if (loading) return
    if (!trimmed && filesToSend.length === 0) return
    if (!user) return toast("login to send message")
    if (!selectedChat?._id) return toast.error("Open a chat first")
    if (demoMode) return

    voiceRef.current?.cancelListening()
    setLoading(true)
    setPrompt("")
    setFiles([])
    const assistantTimestamp = Date.now()
    const userTimestamp = assistantTimestamp
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmed || filesToSend.map((file) => file.name).join(", "),
        timestamp: userTimestamp,
        attachments: filesToSend,
      },
      {
        role: "assistant",
        content: "",
        timestamp: assistantTimestamp,
      },
    ])

    try {
      const payload = {
        chatId: selectedChat._id,
        prompt: trimmed,
        provider: aiProvider,
        attachments: filesToSend.map(({ name, type, text, dataUrl }) => ({
          name,
          type,
          text,
          dataUrl,
        })),
      }

      const apiUrl = axios.defaults.baseURL
        ? new URL("/api/message/text", axios.defaults.baseURL)
        : "/api/message/text"
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to get a response")
      }
      if (!response.body) {
        throw new Error("Streaming response is not available")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pending = ""
      let finalReply
      let finalUsage

      const processLine = (line) => {
        if (!line.trim()) return
        const event = JSON.parse(line)
        if (event.error) throw new Error(event.error)
        if (event.content) {
          setMessages((prev) =>
            prev.map((message) =>
              message.role === "assistant" &&
              message.timestamp === assistantTimestamp
                ? { ...message, content: message.content + event.content }
                : message
            )
          )
        }
        if (event.done) {
          finalReply = event.reply
          finalUsage = event.usage
        }
      }

      // Read the response one line at a time.
      while (true) {
        const { value, done } = await reader.read()
        pending += decoder.decode(value || new Uint8Array(), { stream: !done })
        const lines = pending.split("\n")
        pending = lines.pop() || ""
        lines.forEach(processLine)
        if (done) break
      }
      processLine(pending)
      if (!finalReply) throw new Error("The response ended before completion")

      setMessages((prev) =>
        prev.map((message) =>
          message.role === "assistant" &&
          message.timestamp === assistantTimestamp
            ? finalReply
            : message
        )
      )
      if (finalUsage) setUser((prev) => ({ ...prev, ...finalUsage }))
    } catch (error) {
      toast.error(error.message)
      setPrompt(trimmed)
      setFiles(filesToSend)
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.timestamp !== assistantTimestamp &&
            message.timestamp !== userTimestamp
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (sendDisabled) return
    sendMessage(prompt)
  }

  const handlePromptKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      if (!sendDisabled) sendMessage(prompt)
    }
  }

  useEffect(() => {
    if (selectedChat) {
      setMessages(selectedChat.messages)
    }
  }, [selectedChat])

  // display latest msg in chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden dark:bg-[#0f0f17]">
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6"
      >
        {messages.length === 0 && (
          <div className="flex min-h-full flex-col items-center justify-center text-black dark:text-white">
            <div className="flex items-center justify-center gap-3">
              <img
                src={assets.blueshark_logo}
                alt=""
                className="h-14 w-14 rounded-full bg-white object-cover"
              />
              <h1 className="text-3xl font-bold text-center">BlueShark</h1>
            </div>
            <p className="mt-4 text-4xl sm:text-5xl text-center text-gray-400">
              Ask me anything
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        {loading && (
          <div className="loader flex items-center gap-1.5 py-3">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-white animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-white animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-white animate-bounce"></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="w-full max-w-4xl shrink-0 mx-auto px-3 pt-2 pb-3"
        onSubmit={onSubmit}
      >
        <AttachmentPreview
          files={files}
          disabled={loading}
          onRemove={(id) => setFiles((prev) => prev.filter((file) => file.id !== id))}
        />
        <div className="flex items-end gap-2 rounded-3xl border border-primary bg-blue-400 p-3 pl-4 dark:border-[#80609f]/30 dark:bg-[#0f0f17] dark:text-white">
          <AttachMenu
            disabled={loading}
            fileCount={files.length}
            maxAttachments={plan.maxAttachments}
            canUploadImages={plan.monthlyImageLimit > 0}
            imageUploadsRemaining={imageUploadsRemaining}
            onAdd={(next) => {
              if (next.some((file) => file.type.startsWith("image/"))) {
                if (aiProvider !== "gemini") {
                  localStorage.setItem("aiProvider", "gemini")
                  setAiProvider("gemini")
                  toast("Images are read with Gemini. Provider switched to Gemini.")
                }
              }
              setFiles((prev) => [...prev, ...next].slice(0, 5))
            }}
          />
          <AIProviderSelect value={aiProvider} onChange={setAiProvider} />
          <textarea
            ref={promptRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handlePromptKeyDown}
            disabled={loading || listening}
            rows={1}
            className="max-h-36 min-h-12 flex-1 resize-none overflow-y-hidden bg-transparent py-2 text-base outline-none"
            placeholder={listening ? "Listening..." : "Type your prompt here"}
          />
          <VoiceChatControl
            ref={voiceRef}
            prompt={prompt}
            onSendMessage={sendMessage}
            disabled={loading}
            onListeningChange={setListening}
          />
          <button
            type="submit"
            disabled={sendDisabled}
            aria-label="Send"
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            <img
              src={loading ? assets.stop_icon : assets.send_icon}
              alt=""
              className="w-8 cursor-pointer"
            />
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatBox
