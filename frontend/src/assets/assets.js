import user_icon from "./user_icon.svg"
import theme_icon from "./theme_icon.svg"
import send_icon from "./send_icon.svg"
import stop_icon from "./stop_icon.svg"
import close_icon from "./close_icon.svg"
import bin_icon from "./bin_icon.svg"
import logout_icon from "./logout_icon.svg"
import diamond_icon from "./diamond_icon.svg"
import blueshark_logo from "./blueshark-logo.jpg"

export const assets = {
  blueshark_logo,
  user_icon,
  theme_icon,
  send_icon,
  stop_icon,
  close_icon,
  bin_icon,
  logout_icon,
  diamond_icon,
}

export const dummyUserData = {
  _id: "689c6deed410acddc0d95a0e",
  name: "BlueShark Demo",
  email: "demo@blueshark.local",
  password: "$2b$10$VESVdPDjL5LF.KCU6jKyqeXNSLASAAfpR2kkIJExtMO.PJvZJAudy",
  credits: 20,
  planId: "free",
  subscriptionId: "",
  subscriptionPlanId: "",
  subscriptionStatus: "free",
  subscriptionCancelAtPeriodEnd: false,
  imageUploadsThisPeriod: 0,
}

export const dummyPlans = [
  {
    _id: "basic",
    name: "Basic",
    price: 10,
    credits: 100,
    monthlyImageLimit: 20,
    maxAttachments: 5,
    features: [
      "100 chat credits per month",
      "20 image uploads per month",
      "Up to 5 files per message",
      "Text and voice-transcribed message: 1 credit",
      "Message with one or more attachments: 2 credits total",
      "Unused monthly credits and image uploads do not roll over",
      "Image understanding with Gemini",
    ],
  },
  {
    _id: "pro",
    name: "Pro",
    price: 20,
    credits: 500,
    monthlyImageLimit: 100,
    maxAttachments: 5,
    features: [
      "500 chat credits per month",
      "100 image uploads per month",
      "Up to 5 files per message",
      "Text and voice-transcribed message: 1 credit",
      "Message with one or more attachments: 2 credits total",
      "Unused monthly credits and image uploads do not roll over",
      "Image understanding with Gemini",
    ],
  },
  {
    _id: "premium",
    name: "Premium",
    price: 30,
    credits: 1000,
    monthlyImageLimit: 500,
    maxAttachments: 5,
    features: [
      "1,000 chat credits per month",
      "500 image uploads per month",
      "Up to 5 files per message",
      "Text and voice-transcribed message: 1 credit",
      "Message with one or more attachments: 2 credits total",
      "Unused monthly credits and image uploads do not roll over",
      "Image understanding with Gemini",
    ],
  },
]

export const dummyChats = [
  {
    _id: "demo-chat",
    userId: dummyUserData._id,
    userName: dummyUserData.name,
    name: "New Chat",
    messages: [
      {
        role: "user",
        content: "hello",
        timestamp: 1755106415912,
      },
      {
        role: "assistant",
        content: "Hello! How can I assist you today?",
        timestamp: 1755106420723,
      },
    ],
    createdAt: "2025-08-13T17:29:52.421Z",
    updatedAt: "2025-08-14T09:39:19.046Z",
  },
]
