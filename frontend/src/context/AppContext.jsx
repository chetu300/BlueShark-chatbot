import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { useNavigate } from "react-router-dom"
import { dummyChats, dummyUserData } from "../assets/assets"

import axios from "axios"
import toast from "react-hot-toast"

axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL

const demoMode =
  import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true"

const AppContext = createContext()

export const AppContextProvider = ({ children }) => {
  const navigate = useNavigate()
  const [user, setUser] = useState(demoMode ? dummyUserData : null)
  const [chats, setChats] = useState(demoMode ? dummyChats : [])
  const [selectedChat, setSelectedChat] = useState(
    demoMode ? dummyChats[0] : null
  )
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light")
  const [token, setToken] = useState(localStorage.getItem("token") || null)
  const [loadingUser, setLoadingUser] = useState(!demoMode)
  const fetchUser = useCallback(async () => {
    if (demoMode) {
      setUser(dummyUserData)
      setLoadingUser(false)
      return
    }

    try {
      const { data } = await axios.get("/api/user/data", {
        headers: { Authorization: token },
      })
      if (data.success) {
        setUser(data.user)
        if (data.user.subscriptionId) {
          try {
            const { data: subscriptionData } = await axios.get(
              "/api/credit/subscription-status",
              { headers: { Authorization: token } }
            )
            if (subscriptionData.success && subscriptionData.user) {
              setUser((currentUser) => ({
                ...currentUser,
                ...subscriptionData.user,
              }))
            }
          } catch (error) {
            toast.error(
              error.response?.data?.message ||
                "Could not refresh subscription status"
            )
          }
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoadingUser(false)
    }
  }, [token])

  const fetchUserChats = useCallback(async () => {
    if (demoMode) {
      setChats(dummyChats)
      setSelectedChat((currentChat) => currentChat || dummyChats[0])
      return
    }

    try {
      const { data } = await axios.get("/api/chat/getchats", {
        headers: { Authorization: token },
      })
      if (data.success) {
        setChats(data.chats)

        if (data.chats.length === 0) {
          await axios.get("/api/chat/create", {
            headers: { Authorization: token },
          })
          const { data: refreshedData } = await axios.get("/api/chat/getchats", {
            headers: { Authorization: token },
          })
          if (refreshedData.success && refreshedData.chats.length > 0) {
            setChats(refreshedData.chats)
            setSelectedChat(refreshedData.chats[0])
          } else if (refreshedData.success) {
            toast.error("Could not create a new chat")
          } else {
            toast.error(refreshedData.message)
          }
        } else {
          setSelectedChat(data.chats[0])
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }, [token])

  const createNewChat = useCallback(async () => {
    try {
      if (!user) {
        return toast("Login to create a new chat")
      }
      if (demoMode) {
        const chat = {
          _id: `demo-${Date.now()}`,
          name: "New Chat",
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setChats((previousChats) => [chat, ...previousChats])
        setSelectedChat(chat)
        navigate("/")
        return
      }
      navigate("/")
      await axios.get("/api/chat/create", { headers: { Authorization: token } })
      await fetchUserChats()
    } catch (error) {
      toast.error(error.message)
    }
  }, [user, navigate, token, fetchUserChats])

  useEffect(() => {
    if (demoMode) {
      setLoadingUser(false)
      return
    }
    if (token) {
      fetchUser()
    } else {
      setUser(null)
      setLoadingUser(false)
    }
  }, [token, fetchUser])

  useEffect(() => {
    if (user) {
      fetchUserChats()
    } else {
      setChats([])
      setSelectedChat(null)
    }
  }, [user, fetchUserChats])

  //thme

  // Save and apply the theme.
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark" ||
        (!("theme" in localStorage) &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
    )

    if (theme === "light") {
      localStorage.theme = "light"
    } else if (theme === "dark") {
      localStorage.theme = "dark"
    } else {
      localStorage.removeItem("theme")
    }
  }, [theme])

  const value = {
    navigate,
    user,
    setUser,
    fetchUser,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    theme,
    setTheme,
    createNewChat,
    loadingUser,
    fetchUserChats,
    token,
    setToken,
    axios,
    demoMode,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// The context hook is intentionally exported beside its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => useContext(AppContext)
