import express from "express"
import { protect } from "./../middlewares/auth.js"
import {
  confirmCheckoutSession,
  createBillingPortalSession,
  getPlans,
  purchasePlan,
  refreshSubscriptionStatus,
} from "../controllers/creditController.js"
const creditRouter = express.Router()

// Plan and subscription routes.
creditRouter.get("/plan", getPlans)
creditRouter.get("/subscription-status", protect, refreshSubscriptionStatus)
creditRouter.get("/checkout-status", protect, confirmCheckoutSession)
creditRouter.post("/purchase", protect, purchasePlan)
creditRouter.post("/portal", protect, createBillingPortalSession)

export default creditRouter
