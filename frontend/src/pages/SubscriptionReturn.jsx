import { useCallback, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAppContext } from "../context/AppContext"

const MAX_ATTEMPTS = 6
const RETRY_DELAY_MS = 2000

function SubscriptionReturn() {
  const { axios, setUser, token } = useAppContext()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [status, setStatus] = useState("checking")
  const [errorMessage, setErrorMessage] = useState("")

  const checkSubscription = useCallback(async () => {
    setStatus("checking")
    setErrorMessage("")

    if (!sessionId) {
      setStatus("error")
      return
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        const { data } = await axios.get("/api/credit/checkout-status", {
          params: { sessionId },
          headers: { Authorization: token },
        })

        if (data.confirmed && data.user) {
          setUser((currentUser) => ({ ...currentUser, ...data.user }))
          navigate("/credits", { replace: true })
          return
        }
      } catch (error) {
        setStatus("error")
        setErrorMessage(
          error.response?.data?.message ||
            "We couldn't verify the Checkout session. Please try again."
        )
        return
      }

      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    setStatus("pending")
  }, [axios, navigate, sessionId, setUser, token])

  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center dark:bg-gray-900 dark:text-white">
      {status === "checking" ? (
        <>
          <div
            role="status"
            aria-label="Confirming subscription"
            className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
          />
          <h1 className="text-xl font-semibold">Confirming your subscription</h1>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
            We&apos;re checking your payment with Stripe. This may take a few
            seconds.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">
            {status === "error"
              ? "Could not verify your subscription"
              : "Subscription confirmation is taking longer than expected"}
          </h1>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
            {status === "error"
              ? errorMessage ||
                "We couldn't verify the Checkout session. Your subscription has not been changed here."
              : "Stripe has not confirmed this payment yet. Check again before trying checkout another time."}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={checkSubscription}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Check again
            </button>
            <button
              type="button"
              onClick={() => navigate("/credits", { replace: true })}
              className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600"
            >
              Return to plans
            </button>
          </div>
        </>
      )}
    </main>
  )
}

export default SubscriptionReturn
