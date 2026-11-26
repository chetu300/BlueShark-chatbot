import React, { useCallback, useEffect, useState } from "react"
import { dummyPlans } from "../assets/assets"
import Loading from "./Loading"
import { useAppContext } from "../context/AppContext"
import toast from "react-hot-toast"

function Credits() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const { token, axios, demoMode, user, setUser } = useAppContext()
  const userId = user?._id
  const subscriptionId = user?.subscriptionId
  const fetchPlans = useCallback(async () => {
    if (demoMode) {
      setPlans(dummyPlans)
      setLoading(false)
      return
    }

    try {
      const { data } = await axios.get("/api/credit/plan", {
        headers: { Authorization: token },
      })

      if (data.success) {
        setPlans(data.plans)
      } else {
        toast.error(data.message || "Failed to fetch plans")
      }
    } catch (error) {
      toast.error(error.message)
    }
    setLoading(false)
  }, [axios, demoMode, token])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    if (demoMode || !userId) return

    let active = true
    axios
      .get("/api/credit/subscription-status", {
        headers: { Authorization: token },
      })
      .then(({ data }) => {
        if (active && data.success && data.user) {
          setUser((currentUser) => ({ ...currentUser, ...data.user }))
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(
            error.response?.data?.message ||
              "Could not refresh subscription status"
          )
        }
      })

    return () => {
      active = false
    }
  }, [axios, demoMode, setUser, subscriptionId, token, userId])

  const purchasePlan = async (planId) => {
    if (demoMode || checkoutPending) return

    setCheckoutPending(true)
    try {
      const { data } = await axios.post(
        "/api/credit/purchase",
        { planId },
        { headers: { Authorization: token } }
      )
      if (!data.success || !data.url) {
        throw new Error(data.message || "Could not start checkout")
      }
      const checkoutUrl = new URL(data.url)
      if (checkoutUrl.protocol !== "https:") {
        throw new Error("Stripe returned an invalid Checkout URL")
      }
      window.location.href = data.url
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not start checkout"
      )
      setCheckoutPending(false)
    }
  }

  const manageSubscription = async () => {
    if (demoMode) return

    try {
      const { data } = await axios.post(
        "/api/credit/portal",
        {},
        { headers: { Authorization: token } }
      )
      if (!data.success || !data.url) {
        throw new Error(
          data.message || "Could not open subscription management"
        )
      }

      const portalUrl = new URL(data.url)
      if (portalUrl.protocol !== "https:") {
        throw new Error("Stripe returned an invalid subscription portal URL")
      }
      window.location.href = data.url
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not open subscription management"
      )
    }
  }

  if (loading) return <Loading />
  const hasSubscription = ["active", "trialing", "past_due"].includes(
    user?.subscriptionStatus
  )

  return (
    <div
      className="max-w-7xl h-full overflow-y-auto mx-auto px-4 sm:px-6 lg:px-8
bg-white dark:bg-[#0f0f17] transition-colors duration-300"
    >
      <h2 className="text-3xl font-semibold text-center mb-4 xl:mt-30 text-gray-800 dark:text-white ">
        Monthly plans
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-300">
        Plans renew monthly. Text or voice-transcribed messages cost 1 credit;
        a message with attachments costs 2 credits total. Unused credits and
        image uploads reset at renewal.
      </p>
      {hasSubscription && (
        <div className="mx-auto mb-6 max-w-2xl rounded-xl bg-blue-50 p-4 text-center text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <p>
            Current plan: <strong>{plans.find((plan) => plan._id === user.planId)?.name || user.planId}</strong>
            {user.billingPeriodEnd &&
              ` · ${
                user.subscriptionCancelAtPeriodEnd ? "Ends" : "Renews"
              } ${new Date(user.billingPeriodEnd).toLocaleDateString()}`}
          </p>
          {user.subscriptionCancelAtPeriodEnd && user.billingPeriodEnd && (
            <p className="mt-1">
              Cancellation scheduled. Your account is on the Free plan now and
              has the Free plan credits. You will not be charged again.
            </p>
          )}
          {user.subscriptionId && (
            <button
              type="button"
              onClick={manageSubscription}
              className="mt-2 font-semibold underline underline-offset-2"
            >
              Manage or cancel subscription
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-4">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`border border-gray-200 dark:border-blue-500 rounded-lg shadow hover:shadow-lg transition-shadow p-6 min-w-[300px] flex flex-col ${
              plan._id === "pro"
                ? "bg-blue-50 dark:bg-blue-900"
                : "bg-white dark:bg-transparent"
            }
             `}
          >
            <div className="flex-1">
              <h3 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white">
                {plan.name}
              </h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-300 mb-4">
                $ {plan.price}
                <span className="text-base font-normal text-gray-600 dark:text-blue-200">
                  / month · {plan.credits} credits
                </span>
              </p>
              <ul>
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className="list-disc list-inside text-sm text-gray-700
space-y-1
                    dark:text-white"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              disabled={hasSubscription || demoMode || checkoutPending}
              onClick={() => purchasePlan(plan._id)}
              className="mt-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 rounded transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkoutPending
                ? "Starting checkout..."
                : hasSubscription
                  ? user.planId === plan._id
                    ? "Current plan"
                    : "Unavailable while subscribed"
                  : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Credits
