import { forwardRef, useImperativeHandle } from "react"
import VoiceAssistant from "./VoiceAssistant"
import useVoiceChat from "../hooks/useVoiceChat"
import { useAppContext } from "../context/AppContext"

const VoiceChatControl = forwardRef(function VoiceChatControl(
  { prompt, onSendMessage, disabled, onListeningChange },
  ref
) {
  const { axios, token } = useAppContext()
  const voice = useVoiceChat({
    prompt,
    sendMessage: onSendMessage,
  })

  const transcribeAudio = async (audio) => {
    const apiUrl = axios.defaults.baseURL
      ? new URL("/api/message/transcribe", axios.defaults.baseURL)
      : "/api/message/transcribe"
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": audio.type || "audio/webm",
      },
      body: audio,
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.message || "Voice transcription failed. Try again.")
    }
    return result.text
  }

  useImperativeHandle(
    ref,
    () => ({
      cancelListening: voice.cancelListening,
    }),
    [voice.cancelListening]
  )

  return (
    <VoiceAssistant
      ref={voice.voiceRef}
      disabled={disabled}
      onTranscribe={transcribeAudio}
      onListeningChange={(value) => {
        voice.capturePromptOnStart(value)
        onListeningChange?.(value)
      }}
      onResult={voice.sendVoiceMessage}
    />
  )
})

export default VoiceChatControl
