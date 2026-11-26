import React, { lazy, Suspense, useState } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import SideBar from "./components/SideBar"
import "./assets/prism.css"
import Loading from "./pages/Loading"
import Login from "./pages/Login"
import SubscriptionReturn from "./pages/SubscriptionReturn"
import { useAppContext } from "./context/AppContext"
import { Toaster } from "react-hot-toast"
import MenuIcon from "./assets/menu_icon.svg?react"
import diamondIcon from "./assets/diamond_icon.svg"
import { assets } from "./assets/assets"

const ChatBox = lazy(() => import("./components/ChatBox"))
const Credits = lazy(() => import("./pages/Credits"))

function App() {
  const { user, loadingUser, selectedChat, navigate } = useAppContext()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { pathname } = useLocation()
  if (loadingUser) return <Loading />
  if (pathname === "/loading") {
    return user ? <SubscriptionReturn /> : <Login />
  }

  return (
    <>
      {/* use toaster anywhere */}
      <Toaster />

      {user ? (
        <div className="flex h-screen relative overflow-hidden">
          <div className="">
            <SideBar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
          </div>
          <div className="flex min-w-0 min-h-0 flex-1 flex-col bg-gray dark:bg-[#0f0f17]">
            <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#15151d]/90 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setIsMenuOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-white/10 md:hidden"
                >
                  <MenuIcon className="h-6 w-6" />
                </button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-200 p-0.5 shadow-sm dark:from-sky-900 dark:to-indigo-900">
                  <img
                    src={assets.blueshark_logo}
                    alt=""
                    className="h-full w-full rounded-[10px] object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    BlueShark
                  </h1>
                  <p className="hidden text-[11px] leading-3 text-slate-500 dark:text-slate-400 sm:block">
                    AI workspace
                  </p>
                </div>
              </div>
              {(pathname === "/credits" ||
                (selectedChat?.name &&
                  selectedChat.name.toLowerCase() !== "new chat")) && (
                <div className="pointer-events-none absolute left-1/2 hidden max-w-[35%] -translate-x-1/2 md:block">
                  <p className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">
                    {pathname === "/credits" ? "Monthly plans" : selectedChat.name}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate("/credits")}
                aria-label={`${user?.credits || 0} credits. View plans`}
                className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-sky-200/80 bg-sky-50 px-3 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-800/60 dark:bg-sky-950/60 dark:text-sky-200 dark:hover:bg-sky-900/70"
              >
                <img
                  src={diamondIcon}
                  alt=""
                  className="h-4 w-4 dark:brightness-0 dark:invert"
                />
                <span>{user?.credits || 0}</span>
                <span className="hidden sm:inline">credits</span>
              </button>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<ChatBox />} />
                  <Route path="/credits" element={<Credits />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      ) : (
        <div>
          <Login />
        </div>
      )}
    </>
  )
}

export default App
