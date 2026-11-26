import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import toast from "react-hot-toast"

function MicIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}

const VoiceAssistant = forwardRef(function VoiceAssistant(
  { disabled = false, onResult, onListeningChange, onTranscribe },
  ref
) {
  const recorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const audioChunksRef = useRef([])
  const startingRef = useRef(false)
  const shouldSubmitRef = useRef(false)
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)

  const setListeningState = (value) => {
    setListening(value)
    onListeningChange?.(value)
  }

  const releaseMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const stopSilenceDetection = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    analyserRef.current = null
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const detectSpeechEnd = (recorder, analyser) => {
    const samples = new Uint8Array(analyser.fftSize)
    let speechStarted = false
    let lastSpeechTime = 0

    const checkAudioLevel = () => {
      if (recorderRef.current !== recorder || recorder.state !== "recording") {
        return
      }

      analyser.getByteTimeDomainData(samples)
      const amplitude = Math.sqrt(
        samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) /
          samples.length
      )
      const now = performance.now()

      if (amplitude > 0.02) {
        speechStarted = true
        lastSpeechTime = now
      } else if (speechStarted && now - lastSpeechTime >= 1400) {
        // Stop when speech pauses.
        stopListening()
        return
      }

      animationFrameRef.current = requestAnimationFrame(checkAudioLevel)
    }

    animationFrameRef.current = requestAnimationFrame(checkAudioLevel)
  }

  const stopListening = () => {
    const recorder = recorderRef.current
    if (!recorder) {
      if (startingRef.current) {
        shouldSubmitRef.current = false
        startingRef.current = false
        setListeningState(false)
      }
      return
    }
    if (recorder.state === "inactive") return

    shouldSubmitRef.current = true
    recorder.stop()
  }

  const cancelListening = () => {
    const recorder = recorderRef.current
    shouldSubmitRef.current = false
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
    } else if (startingRef.current) {
      startingRef.current = false
      setListeningState(false)
    }
  }

  useImperativeHandle(ref, () => ({
    cancelListening,
  }))

  const startListening = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder ||
      !window.AudioContext
    ) {
      toast.error("Voice recording is not supported in this browser.")
      return
    }

    setListeningState(true)
    startingRef.current = true
    shouldSubmitRef.current = true
    audioChunksRef.current = []

    try {
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      await audioContext.resume()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!shouldSubmitRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        stopSilenceDetection()
        setListeningState(false)
        return
      }

      startingRef.current = false
      mediaStreamRef.current = stream
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      )
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        recorderRef.current = null
        stopSilenceDetection()
        releaseMediaStream()
        setListeningState(false)

        const shouldSubmit = shouldSubmitRef.current
        shouldSubmitRef.current = false
        if (!shouldSubmit) return

        const audio = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        audioChunksRef.current = []
        if (!audio.size) {
          toast.error("Kuch record nahi hua. Dobara bolkar try karo.")
          return
        }

        setProcessing(true)
        try {
          const text = (await onTranscribe(audio))?.trim()
          if (text) onResult?.(text)
          else toast.error("Awaaz samajh nahi aayi. Dobara bolkar try karo.")
        } catch (error) {
          toast.error(error.message || "Voice transcription failed. Try again.")
        } finally {
          setProcessing(false)
        }
      }
      recorder.start()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      audioContext.createMediaStreamSource(stream).connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      detectSpeechEnd(recorder, analyser)
    } catch (error) {
      startingRef.current = false
      shouldSubmitRef.current = false
      recorderRef.current = null
      stopSilenceDetection()
      releaseMediaStream()
      setListeningState(false)
      toast.error(
        error.name === "NotAllowedError"
          ? "Browser mein microphone permission allow karo."
          : error.name === "NotFoundError"
            ? "Microphone nahi mila. Mic connection check karo."
            : error.message || "Mic start nahi hua. Dobara try karo."
      )
    }
  }

  const toggleMic = () => {
    if (disabled || processing) return
    if (recorderRef.current) {
      stopListening()
      return
    }
    startListening()
  }

  useEffect(
    () => () => {
      shouldSubmitRef.current = false
      startingRef.current = false
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop()
      recorderRef.current = null
      stopSilenceDetection()
      releaseMediaStream()
    },
    []
  )

  return (
    <button
      type="button"
      onClick={toggleMic}
      disabled={disabled || processing}
      aria-label={
        processing
          ? "Transcribing voice"
          : listening
            ? "Stop listening and send"
            : "Voice input"
      }
      aria-pressed={listening}
      title={
        processing
          ? "Transcribing voice..."
          : listening
            ? "Stop listening and send now; pauses send automatically"
            : "Speak to chat"
      }
      className={`relative flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors ${
        listening
          ? "bg-red-500 text-white"
          : "text-gray-700 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/15"
      } disabled:opacity-40`}
    >
      {listening && (
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
      )}
      <MicIcon className="relative w-5 h-5" />
    </button>
  )
})

export default VoiceAssistant
