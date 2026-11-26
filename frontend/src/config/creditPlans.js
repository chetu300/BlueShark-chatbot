export const creditPlans = {
  free: {
    name: "Free",
    credits: 40,
    creditRenewalHours: 24,
    monthlyImageLimit: 5,
    maxAttachments: 5,
  },
  basic: {
    name: "Basic",
    credits: 100,
    monthlyImageLimit: 20,
    maxAttachments: 5,
  },
  pro: {
    name: "Pro",
    credits: 500,
    monthlyImageLimit: 100,
    maxAttachments: 5,
  },
  premium: {
    name: "Premium",
    credits: 1000,
    monthlyImageLimit: 500,
    maxAttachments: 5,
  },
}

export const getCreditPlan = (planId) =>
  creditPlans[planId] || creditPlans.free

export const getImageUploadsUsed = (user) => {
  const used = Number(user?.imageUploadsThisPeriod || 0)
  if (user?.planId !== "free" || !user?.imageUsagePeriodStart) return used

  const periodStart = new Date(user.imageUsagePeriodStart)
  const now = new Date()
  const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  return periodStart.getTime() < currentMonthStart ? 0 : used
}
