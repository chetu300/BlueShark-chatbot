import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { getCreditPlan } from "../configs/creditPlans.js"

const FREE_CREDIT_PERIOD_MS = 24 * 60 * 60 * 1000

const refreshFreeCredits = async (user) => {
  if (user.planId !== "free") return user

  const now = new Date()
  let periodStart = user.freeCreditsPeriodStart

  if (!periodStart) {
    periodStart = user.createdAt || now
    await User.updateOne(
      {
        _id: user._id,
        planId: "free",
        $or: [
          { freeCreditsPeriodStart: null },
          { freeCreditsPeriodStart: { $exists: false } },
        ],
      },
      { $set: { freeCreditsPeriodStart: periodStart } }
    )
    user = await User.findById(user._id).select("-password")
    if (!user || user.planId !== "free") return user
    periodStart = user.freeCreditsPeriodStart
  }

  if (now.getTime() - new Date(periodStart).getTime() >= FREE_CREDIT_PERIOD_MS) {
    await User.updateOne(
      {
        _id: user._id,
        planId: "free",
        freeCreditsPeriodStart: periodStart,
      },
      {
        $set: {
          credits: getCreditPlan("free").credits,
          freeCreditsPeriodStart: now,
        },
      }
    )
    user = await User.findById(user._id).select("-password")
  }

  return user
}

export const protect = async (req, res, next) => {
  const token = req.headers.authorization

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ message: "Not authorized ,token failed" })
  }

  try {
    const userId = decoded.id
    let user = await User.findById(userId).select("-password")

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized,User not found" })
    }
    user = await refreshFreeCredits(user)
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized,User not found" })
    }

    req.user = user
    return next()
  } catch (error) {
    console.error("Could not refresh account credits:", error.message)
    return res.status(500).json({
      success: false,
      message: "Could not refresh account data. Please try again.",
    })
  }
}
