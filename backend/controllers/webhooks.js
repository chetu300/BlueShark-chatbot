import Stripe from "stripe"
import { getCreditPlan } from "../configs/creditPlans.js"
import User from "../models/User.js"

const getSubscriptionId = (invoice) => {
  const subscription = invoice.subscription ||
    invoice.parent?.subscription_details?.subscription
  return typeof subscription === "string" ? subscription : subscription?.id
}

const findUserForSubscription = (subscription, fields) => {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id

  return User.findOne({
    $or: [
      { subscriptionId: subscription.id },
      ...(customerId
        ? [
            {
              stripeCustomerId: customerId,
              $or: [{ subscriptionId: "" }, { subscriptionId: null }],
            },
          ]
        : []),
    ],
  }).select(fields)
}

const getInvoicePeriod = (invoice, subscription) => {
  const linePeriod = invoice.lines?.data?.find((line) => line.period)?.period
  const start = linePeriod?.start || subscription.current_period_start
  const end = linePeriod?.end || subscription.current_period_end

  return {
    start: start ? new Date(start * 1000) : new Date(),
    end: end ? new Date(end * 1000) : null,
  }
}

export const stripeWebhooks = async (req, res) => {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOKS_SECRET_KEY

  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    console.error(
      "Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET."
    )
    return res.status(500).send("Stripe webhook is not configured")
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      webhookSecret
    )
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message)
    return res.status(401).send("Webhook signature verification failed")
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const { appId, userId, planId } = session.metadata || {}
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id

      if (
        appId === "blueshark" &&
        userId &&
        subscriptionId &&
        getCreditPlan(planId)._id === planId
      ) {
        await User.updateOne(
          { _id: userId },
          {
            $set: {
              subscriptionId,
              subscriptionPlanId: planId,
              stripeCustomerId:
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id || "",
            },
          }
        )
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object
      const subscriptionId = getSubscriptionId(invoice)
      if (!subscriptionId) return res.json({ received: true })

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const { appId, userId, planId } = subscription.metadata || {}
      const linkedUser = userId
        ? null
        : await findUserForSubscription(
            subscription,
            "_id subscriptionPlanId planId"
          )
      const resolvedPlanId =
        planId || linkedUser?.subscriptionPlanId || linkedUser?.planId
      const plan = getCreditPlan(resolvedPlanId)
      if (
        (appId && appId !== "blueshark") ||
        (!userId && !linkedUser) ||
        plan._id !== resolvedPlanId ||
        plan._id === "free" ||
        !["active", "trialing"].includes(subscription.status)
      ) {
        return res.json({ received: true })
      }

      const targetUser = userId
        ? { _id: userId }
        : { _id: linkedUser._id }
      const period = getInvoicePeriod(invoice, subscription)
      const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end)
      // Skip invoices already handled.
      await User.updateOne(
        { ...targetUser, lastPaidInvoiceId: { $ne: invoice.id } },
        {
          $set: {
            planId: cancelAtPeriodEnd ? "free" : plan._id,
            credits: cancelAtPeriodEnd
              ? getCreditPlan("free").credits
              : plan.credits,
            subscriptionId,
            subscriptionPlanId: plan._id,
            stripeCustomerId:
              typeof subscription.customer === "string"
                ? subscription.customer
                : subscription.customer?.id || "",
            subscriptionStatus: subscription.status,
            subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
            billingPeriodStart: period.start,
            billingPeriodEnd: period.end,
            imageUploadsThisPeriod: 0,
            lastPaidInvoiceId: invoice.id,
          },
        }
      )
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object
      const linkedUser = await findUserForSubscription(
        subscription,
        "_id subscriptionId subscriptionPlanId planId"
      )
      if (linkedUser) {
        const { appId, planId: metadataPlanId } = subscription.metadata || {}
        if (appId && appId !== "blueshark") {
          return res.json({ received: true })
        }

        if (subscription.status === "incomplete_expired") {
          await User.updateOne(
            { _id: linkedUser._id },
            {
              $set: {
                planId: "free",
                credits: getCreditPlan("free").credits,
                subscriptionStatus: "free",
                subscriptionId: "",
                subscriptionPlanId: "",
                subscriptionCancelAtPeriodEnd: false,
                billingPeriodStart: null,
                billingPeriodEnd: null,
              },
            }
          )
        } else if (subscription.cancel_at_period_end) {
          const paidPlanId =
            metadataPlanId || linkedUser.subscriptionPlanId || linkedUser.planId
          const plan = getCreditPlan(paidPlanId)
          await User.updateOne(
            { _id: linkedUser._id },
            {
              $set: {
                planId: "free",
                credits: getCreditPlan("free").credits,
                subscriptionId: subscription.id,
                subscriptionPlanId: plan._id,
                subscriptionStatus: subscription.status,
                subscriptionCancelAtPeriodEnd: true,
                billingPeriodEnd: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000)
                  : null,
              },
            }
          )
        } else {
          const paidPlanId =
            metadataPlanId || linkedUser.subscriptionPlanId || linkedUser.planId
          const plan = getCreditPlan(paidPlanId)
          await User.updateOne(
            {
              _id: linkedUser._id,
              subscriptionCancelAtPeriodEnd: true,
            },
            {
              $set: {
                planId: plan._id === paidPlanId ? plan._id : "free",
                subscriptionPlanId:
                  plan._id === paidPlanId ? plan._id : "",
                ...(plan._id === paidPlanId ? { credits: plan.credits } : {}),
                subscriptionStatus: subscription.status,
                subscriptionCancelAtPeriodEnd: false,
                billingPeriodEnd: subscription.current_period_end
                  ? new Date(subscription.current_period_end * 1000)
                  : null,
              },
            }
          )
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object
      const linkedUser = await findUserForSubscription(subscription, "_id")
      if (!linkedUser) {
        return res.json({ received: true })
      }

      await User.updateOne(
        { _id: linkedUser._id },
        {
          $set: {
            planId: "free",
            credits: getCreditPlan("free").credits,
            subscriptionStatus: "free",
            subscriptionId: "",
            subscriptionPlanId: "",
            subscriptionCancelAtPeriodEnd: false,
            billingPeriodStart: null,
            billingPeriodEnd: null,
            imageUploadsThisPeriod: 0,
          },
        }
      )
    }

    if (event.type === "invoice.payment_failed") {
      const subscriptionId = getSubscriptionId(event.data.object)
      if (subscriptionId) {
        await User.updateOne(
          { subscriptionId },
          { $set: { subscriptionStatus: "past_due" } }
        )
      }
    }

    res.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook processing failed:", error)
    res.status(500).send("Webhook processing failed")
  }
}
