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

const ChatBox = lazy(() => import("./components/ChatBox"))
const Credits = lazy(() => import("./pages/Credits"))

function App() {
  const { user, loadingUser } = useAppContext()
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

      {!isMenuOpen && (
        <MenuIcon
          onClick={() => setIsMenuOpen(true)}
          className="absolute top-3 left-3 w-8 h-8 cursor-pointer md:hidden  dark:text-white transition-colors z-20"
        />
      )}
      {user ? (
        <div className="flex h-screen relative overflow-hidden">
          <div className="">
            <SideBar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
          </div>
          <div className="flex-3 bg-gray dark:bg-[#0f0f17] overflow-y-auto">
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<ChatBox />} />
                <Route path="/credits" element={<Credits />} />
              </Routes>
            </Suspense>
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
