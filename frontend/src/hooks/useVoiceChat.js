import { useRef } from "react"

function useVoiceChat({ prompt, sendMessage }) {
  const voiceRef = useRef(null)
  const voiceDraftBaseRef = useRef("")

  const capturePromptOnStart = (value) => {
    if (value) voiceDraftBaseRef.current = prompt
  }

  const sendVoiceMessage = (text) => {
    const base = voiceDraftBaseRef.current
    const separator = base && text && !/\s$/.test(base) ? " " : ""
    const message = `${base}${separator}${text}`.trim()
    if (!message) return

    sendMessage(message)
  }

  return {
    voiceRef,
    capturePromptOnStart,
    sendVoiceMessage,
    cancelListening: () => voiceRef.current?.cancelListening(),
  }
}

export default useVoiceChat
