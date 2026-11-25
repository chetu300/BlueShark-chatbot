import React, { useState, useEffect, useRef } from "react"
import { useAppContext } from "../context/AppContext"
import Message from "./Message"
import VoiceChatControl from "./VoiceChatControl"
import AttachMenu, { AttachmentPreview } from "./AttachMenu"
import AIProviderSelect from "./AIProviderSelect"
import { assets } from "../assets/assets"
import toast from "react-hot-toast"
import { getCreditPlan, getImageUploadsUsed } from "../config/creditPlans"

function ChatBox() {
  const { selectedChat, user, axios, setUser, token, demoMode } =
    useAppContext()

  const containerRef = useRef(null)
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
    sendMessage(prompt)
  }
  useEffect(() => {
    if (selectedChat) {
      setMessages(selectedChat.messages)
    }
  }, [selectedChat])

  // display latest msg in chat
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages])

  return (
    <div
      className="flex-1 flex flex-col h-screen  dark:bg-[#0f0f17]
  "
    >
      {/* chat messaages */}
      <div ref={containerRef} className="flex-1 mb-5 ">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-screen text-black dark:text-white">
            {/* {`${
                theme === "dark" ? "text-white" : "text-black"
            `  } */}
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
        {/* msg.length>0  */}
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        {/* loading */}
        {loading && (
          <div className="loader flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full  bg-gray-400 dark:bg-white animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full  bg-gray-400 dark:bg-white animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full  bg-gray-400 dark:bg-white animate-bounce"></div>
          </div>
        )}
      </div>

      {/* prompt input  bg-primary/20*/}

      <form
        className="sticky bottom-0 w-full max-w-2xl mx-auto px-3 pb-3"
        onSubmit={onSubmit}
      >
        <AttachmentPreview
          files={files}
          disabled={loading}
          onRemove={(id) => setFiles((prev) => prev.filter((file) => file.id !== id))}
        />
        <div className="bg-blue-400 dark:bg-[#0f0f17] dark:text-white border border-primary dark:border-[#80609f]/30 rounded-full pl-2 flex items-center gap-2">
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
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading || listening}
          className="flex-1 w-full text-sm outline-none bg-transparent"
          placeholder={listening ? "Listening..." : "Type your prompt here"}
          required={!listening && files.length === 0}
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
          disabled={loading || listening}
          aria-label="Send"
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
