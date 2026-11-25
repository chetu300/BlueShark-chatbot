import Stripe from "stripe"
import {
  creditPlans,
  getCreditPlan,
  getPlanFeatures,
} from "../configs/creditPlans.js"
import User from "../models/User.js"

export const getFrontendUrl = (req) => {
  let configuredUrl = process.env.FRONTEND_URL
  if (!configuredUrl && process.env.NODE_ENV !== "production") {
    const requestOrigin = req.headers.origin
    try {
      const originUrl = new URL(requestOrigin)
      if (
        ["localhost", "127.0.0.1", "::1"].includes(originUrl.hostname) &&
        ["http:", "https:"].includes(originUrl.protocol)
      ) {
        configuredUrl = originUrl.origin
      }
    } catch {
      configuredUrl = "http://localhost:5173"
    }
  }
  if (!configuredUrl) return null

  try {
    const url = new URL(configuredUrl)
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    ) {
      return null
    }
    return url.toString().replace(/\/+$/, "")
  } catch {
    return null
  }
}

export const getPlans = (_req, res) => {
  res.json({
    success: true,
    plans: creditPlans.map((plan) => ({
      ...plan,
      features: getPlanFeatures(plan),
    })),
  })
}

export const refreshSubscriptionStatus = async (req, res) => {
  if (!req.user.subscriptionId) {
    return res.json({
      success: true,
      user: {
        planId: req.user.planId,
        credits: req.user.credits,
        subscriptionId: "",
        subscriptionPlanId: req.user.subscriptionPlanId || "",
        subscriptionStatus: req.user.subscriptionStatus,
        subscriptionCancelAtPeriodEnd: false,
        billingPeriodStart: req.user.billingPeriodStart,
        billingPeriodEnd: req.user.billingPeriodEnd,
      },
    })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      success: false,
      message: "Subscriptions are not configured.",
    })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const subscription = await stripe.subscriptions.retrieve(
      req.user.subscriptionId
    )
    const { appId, userId, planId } = subscription.metadata || {}
    const paidPlanId =
      planId || req.user.subscriptionPlanId || req.user.planId
    const plan = getCreditPlan(paidPlanId)

    if (
      subscription.id !== req.user.subscriptionId ||
      (appId && appId !== "blueshark") ||
      (userId && userId !== req.user._id.toString()) ||
      plan._id !== paidPlanId ||
      plan._id === "free"
    ) {
      return res.status(403).json({
        success: false,
        message: "This subscription does not belong to this account.",
      })
    }

    const isCanceled = ["canceled", "incomplete_expired"].includes(
      subscription.status
    )
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null
    const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end)
    const restorePaidPlan =
      !isCanceled &&
      !cancelAtPeriodEnd &&
      req.user.subscriptionCancelAtPeriodEnd &&
      req.user.planId === "free"
    const update = isCanceled
      ? {
          planId: "free",
          credits: getCreditPlan("free").credits,
          subscriptionPlanId: "",
          subscriptionStatus: "free",
          subscriptionId: "",
          subscriptionCancelAtPeriodEnd: false,
          billingPeriodStart: null,
          billingPeriodEnd: null,
          imageUploadsThisPeriod: 0,
        }
      : {
          subscriptionStatus: subscription.status,
          subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
          billingPeriodEnd: periodEnd,
          ...(cancelAtPeriodEnd
            ? {
                planId: "free",
                credits: getCreditPlan("free").credits,
                subscriptionPlanId: plan._id,
              }
            : restorePaidPlan
              ? {
                  planId: plan._id,
                  subscriptionPlanId: plan._id,
                  credits: plan.credits,
                }
              : {}),
        }
    const user = await User.findOneAndUpdate(
      { _id: req.user._id, subscriptionId: subscription.id },
      { $set: update },
      {
        new: true,
        select:
          "planId credits subscriptionId subscriptionPlanId subscriptionStatus subscriptionCancelAtPeriodEnd billingPeriodStart billingPeriodEnd",
      }
    )

    if (!user) {
      return res.status(409).json({
        success: false,
        message: "Subscription changed while it was being refreshed. Try again.",
      })
    }

    return res.json({
      success: true,
      user: {
        planId: user.planId,
        credits: user.credits,
        subscriptionId: user.subscriptionId,
        subscriptionPlanId: user.subscriptionPlanId,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionCancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
        billingPeriodStart: user.billingPeriodStart,
        billingPeriodEnd: user.billingPeriodEnd,
      },
    })
  } catch (error) {
    console.error("Could not refresh Stripe subscription:", error.message)
    return res.status(502).json({
      success: false,
      message: "Could not refresh the subscription with Stripe. Please try again.",
    })
  }
}

export const confirmCheckoutSession = async (req, res) => {
  const { sessionId } = req.query
  if (typeof sessionId !== "string" || !sessionId) {
    return res.status(400).json({
      success: false,
      message: "A Checkout session ID is required.",
    })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      success: false,
      message: "Subscriptions are not configured.",
    })
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })
    const { appId, userId, planId } = session.metadata || {}
    const plan = creditPlans.find((item) => item._id === planId)
    const sessionUserId = userId || session.client_reference_id
    const subscription =
      typeof session.subscription === "object" ? session.subscription : null

    if (
      session.mode !== "subscription" ||
      appId !== "blueshark" ||
      sessionUserId !== req.user._id.toString() ||
      !plan
    ) {
      return res.status(403).json({
        success: false,
        message: "This Checkout session does not belong to this account.",
      })
    }

    if (
      session.payment_status !== "paid" ||
      !subscription ||
      !["active", "trialing"].includes(subscription.status)
    ) {
      return res.json({ success: true, confirmed: false })
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id || ""
    const now = new Date()
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : now
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null
    const imageUsagePeriodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    )
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        $or: [
          { subscriptionId: { $ne: subscription.id } },
          { planId: { $ne: plan._id } },
          { subscriptionStatus: { $nin: ["active", "trialing"] } },
        ],
      },
      {
        $set: {
          planId: plan._id,
          credits: plan.credits,
          subscriptionId: subscription.id,
          subscriptionPlanId: plan._id,
          stripeCustomerId: customerId,
          subscriptionStatus: subscription.status,
          subscriptionCancelAtPeriodEnd: Boolean(
            subscription.cancel_at_period_end
          ),
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          imageUploadsThisPeriod: 0,
          imageUsagePeriodStart,
        },
      },
      {
        new: true,
        select:
          "planId credits subscriptionId subscriptionPlanId stripeCustomerId subscriptionStatus subscriptionCancelAtPeriodEnd imageUploadsThisPeriod imageUsagePeriodStart billingPeriodStart billingPeriodEnd",
      }
    )

    const account =
      updatedUser ||
      (await User.findById(req.user._id).select(
        "planId credits subscriptionId subscriptionPlanId stripeCustomerId subscriptionStatus subscriptionCancelAtPeriodEnd imageUploadsThisPeriod imageUsagePeriodStart billingPeriodStart billingPeriodEnd"
      ))
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." })
    }

    if (
      account.subscriptionId !== subscription.id ||
      account.planId !== plan._id ||
      !["active", "trialing"].includes(account.subscriptionStatus)
    ) {
      return res.status(409).json({
        success: false,
        message: "The subscription could not be activated. Please contact support.",
      })
    }

    return res.json({
      success: true,
      confirmed: true,
      user: {
        planId: account.planId,
        credits: account.credits,
        subscriptionId: account.subscriptionId,
        subscriptionPlanId: account.subscriptionPlanId,
        stripeCustomerId: account.stripeCustomerId,
        subscriptionStatus: account.subscriptionStatus,
        subscriptionCancelAtPeriodEnd: account.subscriptionCancelAtPeriodEnd,
        imageUploadsThisPeriod: account.imageUploadsThisPeriod,
        imageUsagePeriodStart: account.imageUsagePeriodStart,
        billingPeriodStart: account.billingPeriodStart,
        billingPeriodEnd: account.billingPeriodEnd,
      },
    })
  } catch (error) {
    console.error("Could not verify Stripe Checkout session:", error.message)
    return res.status(502).json({
      success: false,
      message: "Could not verify the payment with Stripe. Please try again.",
    })
  }
}

export const purchasePlan = async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Subscriptions are not configured. Add STRIPE_SECRET_KEY to the backend environment.",
      })
    }

    const plan = creditPlans.find((item) => item._id === req.body.planId)
    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid plan" })
    }

    if (
      req.user.subscriptionId ||
      ["active", "trialing", "past_due"].includes(req.user.subscriptionStatus)
    ) {
      return res.status(409).json({
        success: false,
        message: "You already have an active subscription.",
      })
    }

    const appUrl = getFrontendUrl(req)
    if (!appUrl) {
      return res.status(400).json({
        success: false,
        message:
          "Set FRONTEND_URL to a valid frontend URL (HTTPS is required in production) before starting subscription checkout.",
      })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const metadata = {
      appId: "blueshark",
      userId: req.user._id.toString(),
      planId: plan._id,
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: plan.price * 100,
            recurring: { interval: "month" },
            product_data: { name: `${plan.name} monthly plan` },
          },
          quantity: 1,
        },
      ],
      customer: req.user.stripeCustomerId || undefined,
      customer_email: req.user.stripeCustomerId ? undefined : req.user.email,
      client_reference_id: req.user._id.toString(),
      metadata,
      subscription_data: { metadata },
      success_url: `${appUrl}/loading?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/credits?subscription=cancelled`,
    })

    res.json({ success: true, url: session.url })
  } catch (error) {
    console.error("Could not create subscription checkout:", error)
    res.status(502).json({
      success: false,
      message: "Could not start subscription checkout. Please try again.",
    })
  }
}

export const createBillingPortalSession = async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: "Subscriptions are not configured. Add STRIPE_SECRET_KEY to the backend environment.",
      })
    }
    if (!req.user.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        message: "No Stripe subscription was found for this account.",
      })
    }

    const appUrl = getFrontendUrl(req)
    if (!appUrl) {
      return res.status(400).json({
        success: false,
        message:
          "Set FRONTEND_URL to a valid frontend URL (HTTPS is required in production) before opening subscription management.",
      })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${appUrl}/credits`,
    })
    res.json({ success: true, url: session.url })
  } catch (error) {
    console.error("Could not create subscription management session:", error)
    res.status(502).json({
      success: false,
      message: "Could not open subscription management. Please try again.",
    })
  }
}
