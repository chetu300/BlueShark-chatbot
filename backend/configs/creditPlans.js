// Paid plans
export const creditPlans = [
  {
    _id: "basic",
    name: "Basic",
    price: 10,
    credits: 100,
    monthlyImageLimit: 20,
    maxAttachments: 5,
  },
  {
    _id: "pro",
    name: "Pro",
    price: 20,
    credits: 500,
    monthlyImageLimit: 100,
    maxAttachments: 5,
  },
  {
    _id: "premium",
    name: "Premium",
    price: 30,
    credits: 1000,
    monthlyImageLimit: 500,
    maxAttachments: 5,
  },
]

export const freePlan = {
  _id: "free",
  name: "Free",
  price: 0,
  credits: 40,
  creditRenewalHours: 24,
  monthlyImageLimit: 5,
  maxAttachments: 5,
}

// Use the free plan if not found.
export const getCreditPlan = (planId) =>
  creditPlans.find((plan) => plan._id === planId) || freePlan

export const getPlanFeatures = (plan) => [
  plan._id === "free"
    ? `${plan.credits.toLocaleString()} chat credits every 24 hours`
    : `${plan.credits.toLocaleString()} chat credits per month`,
  `${plan.monthlyImageLimit.toLocaleString()} image uploads per month`,
  `Up to ${plan.maxAttachments} files per message`,
  "Text message: 1 credit; message with attachments: 2 credits total",
  plan._id === "free"
    ? "Daily credits refresh every 24 hours; monthly image uploads do not roll over"
    : "Unused monthly credits and image uploads do not roll over",
  "Image understanding with Gemini",
]
