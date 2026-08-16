// Auto-generated from mybingocard-redesigns/prototype/state-manifest.js
export type MbcState = { id: string; label: string };
export const MBC_STATES: Record<string, MbcState[]> = {
  "/pricing": [
    {
      "id": "compare",
      "label": "Plan comparison"
    },
    {
      "id": "current-free",
      "label": "Current free plan"
    },
    {
      "id": "success",
      "label": "Checkout success"
    },
    {
      "id": "canceled",
      "label": "Checkout canceled"
    }
  ],
  "/create": [
    {
      "id": "standard",
      "label": "Standard words"
    },
    {
      "id": "numbers75",
      "label": "75-ball numbers"
    },
    {
      "id": "numbers90",
      "label": "90-ball numbers"
    },
    {
      "id": "ai",
      "label": "AI ideas"
    },
    {
      "id": "images",
      "label": "Image squares"
    },
    {
      "id": "style",
      "label": "Style editor"
    },
    {
      "id": "guest-save",
      "label": "Guest save"
    },
    {
      "id": "limit",
      "label": "Free limit"
    },
    {
      "id": "batch",
      "label": "Batch setup"
    },
    {
      "id": "batch-result",
      "label": "Batch result"
    },
    {
      "id": "load-error",
      "label": "Saved card load failed"
    },
    {
      "id": "autosave-error",
      "label": "Autosave failed"
    }
  ],
  "/login": [
    {
      "id": "password",
      "label": "Password sign in"
    },
    {
      "id": "magic",
      "label": "Magic link"
    },
    {
      "id": "magic-sent",
      "label": "Magic link sent"
    },
    {
      "id": "verified",
      "label": "Email verified"
    },
    {
      "id": "invalid",
      "label": "Invalid credentials"
    },
    {
      "id": "unverified",
      "label": "Email unverified"
    }
  ],
  "/signup": [
    {
      "id": "form",
      "label": "Create account"
    },
    {
      "id": "created",
      "label": "Account created"
    }
  ],
  "/magic-link": [
    {
      "id": "loading",
      "label": "Signing in"
    },
    {
      "id": "invalid",
      "label": "Invalid link"
    }
  ],
  "/auth-error": [
    {
      "id": "default",
      "label": "Unknown sign-in error"
    },
    {
      "id": "verification",
      "label": "Verification link used"
    },
    {
      "id": "account-not-linked",
      "label": "Account not linked"
    },
    {
      "id": "configuration",
      "label": "Configuration error"
    },
    {
      "id": "oauth-signin",
      "label": "Google sign-in failed"
    }
  ],
  "/verify-email": [
    {
      "id": "waiting",
      "label": "Check your inbox"
    },
    {
      "id": "resent",
      "label": "Verification resent"
    },
    {
      "id": "invalid-token",
      "label": "Invalid token"
    },
    {
      "id": "expired-token",
      "label": "Expired token"
    },
    {
      "id": "server-error",
      "label": "Server error"
    },
    {
      "id": "resend-error",
      "label": "Resend failed"
    }
  ],
  "/forgot-password": [
    {
      "id": "form",
      "label": "Reset request"
    },
    {
      "id": "submitting",
      "label": "Sending request"
    },
    {
      "id": "success",
      "label": "Reset email requested"
    },
    {
      "id": "server-error",
      "label": "Request rejected"
    },
    {
      "id": "network-error",
      "label": "Network unavailable"
    }
  ],
  "/reset-password": [
    {
      "id": "form",
      "label": "Choose password"
    },
    {
      "id": "success",
      "label": "Password updated"
    },
    {
      "id": "invalid",
      "label": "Invalid link"
    }
  ],
  "/activate": [
    {
      "id": "choice",
      "label": "Choose a plan"
    },
    {
      "id": "success",
      "label": "Plan activated"
    },
    {
      "id": "canceled",
      "label": "Activation canceled"
    }
  ],
  "/welcome": [
    {
      "id": "create-first",
      "label": "Create your first card"
    }
  ],
  "/cards/demo-card": [
    {
      "id": "play",
      "label": "Card workspace"
    },
    {
      "id": "batch-select",
      "label": "Select a batch"
    },
    {
      "id": "checkout",
      "label": "Batch checkout"
    },
    {
      "id": "batch-result",
      "label": "Batch ready"
    },
    {
      "id": "invite",
      "label": "Invite players"
    },
    {
      "id": "loading",
      "label": "Loading card"
    },
    {
      "id": "load-error",
      "label": "Card load failed"
    },
    {
      "id": "autosave-error",
      "label": "Autosave failed"
    },
    {
      "id": "checkout-canceled",
      "label": "Checkout canceled"
    },
    {
      "id": "checkout-error",
      "label": "Checkout unavailable"
    },
    {
      "id": "export-error",
      "label": "Export failed"
    },
    {
      "id": "link-error",
      "label": "Player link failed"
    }
  ],
  "/dashboard/share-links": [
    {
      "id": "populated",
      "label": "Active links"
    },
    {
      "id": "history",
      "label": "Link history"
    },
    {
      "id": "empty",
      "label": "No links yet"
    }
  ],
  "/play/demo-link": [
    {
      "id": "loading",
      "label": "Loading player card"
    },
    {
      "id": "unclaimed",
      "label": "Claim a card"
    },
    {
      "id": "claiming",
      "label": "Claiming card"
    },
    {
      "id": "claim-error",
      "label": "Claim failed"
    },
    {
      "id": "owner",
      "label": "Owner view"
    },
    {
      "id": "claimed-unavailable",
      "label": "Already claimed"
    },
    {
      "id": "expired",
      "label": "Link expired"
    },
    {
      "id": "revoked",
      "label": "Link revoked"
    },
    {
      "id": "playable",
      "label": "Playable card"
    },
    {
      "id": "bingo",
      "label": "Bingo claimed"
    }
  ],
  "/share/demo-share": [
    {
      "id": "loading",
      "label": "Loading shared card"
    },
    {
      "id": "password",
      "label": "Password required"
    },
    {
      "id": "incorrect",
      "label": "Incorrect password"
    },
    {
      "id": "expired",
      "label": "Link expired"
    },
    {
      "id": "not-found",
      "label": "Card not found"
    },
    {
      "id": "playable",
      "label": "Playable card"
    },
    {
      "id": "bingo",
      "label": "Bingo claimed"
    }
  ],
  "/game/host/DEMO42": [
    {
      "id": "waiting",
      "label": "Waiting room"
    },
    {
      "id": "active",
      "label": "Game in progress"
    },
    {
      "id": "finished",
      "label": "Game finished"
    }
  ],
  "/game/play/DEMO42": [
    {
      "id": "waiting",
      "label": "Waiting for host"
    },
    {
      "id": "active",
      "label": "Playing"
    },
    {
      "id": "bingo",
      "label": "You called bingo"
    },
    {
      "id": "other-winner",
      "label": "Another player won"
    },
    {
      "id": "expired",
      "label": "Game unavailable"
    }
  ],
  "/game/join": [
    {
      "id": "form",
      "label": "Join a game"
    },
    {
      "id": "room-found",
      "label": "Room found"
    },
    {
      "id": "joining",
      "label": "Joining room"
    },
    {
      "id": "ended",
      "label": "Game ended"
    },
    {
      "id": "session-expired",
      "label": "Session expired"
    },
    {
      "id": "storage-blocked",
      "label": "Storage blocked"
    },
    {
      "id": "network-error",
      "label": "Network error"
    }
  ],
  "/settings": [
    {
      "id": "free",
      "label": "Free account"
    },
    {
      "id": "premium",
      "label": "Premium account"
    },
    {
      "id": "canceling",
      "label": "Cancellation pending"
    },
    {
      "id": "password",
      "label": "Change password"
    },
    {
      "id": "delete",
      "label": "Delete account"
    }
  ],
  "/dashboard": [
    {
      "id": "populated",
      "label": "Returning creator"
    },
    {
      "id": "first-user",
      "label": "First dashboard"
    }
  ],
  "/dashboard/cards": [
    {
      "id": "populated",
      "label": "Saved cards"
    },
    {
      "id": "empty",
      "label": "No saved cards"
    },
    {
      "id": "batch",
      "label": "Batch mode"
    },
    {
      "id": "selected",
      "label": "Cards selected"
    },
    {
      "id": "delete",
      "label": "Confirm deletion"
    }
  ],
  "/dashboard/referrals": [
    {
      "id": "populated",
      "label": "Referral history"
    },
    {
      "id": "loading",
      "label": "Loading referrals"
    },
    {
      "id": "empty",
      "label": "No referrals"
    },
    {
      "id": "error",
      "label": "Could not load referrals"
    }
  ],
  "/unsubscribe": [
    {
      "id": "form",
      "label": "Email preferences"
    },
    {
      "id": "success",
      "label": "Preferences saved"
    },
    {
      "id": "error",
      "label": "Could not update"
    }
  ],
  "/admin": [
    {
      "id": "overview",
      "label": "Operations overview"
    },
    {
      "id": "attention",
      "label": "Needs attention"
    }
  ],
  "/admin/cards": [
    {
      "id": "populated",
      "label": "Card index"
    },
    {
      "id": "filtered",
      "label": "Filtered cards"
    },
    {
      "id": "preview",
      "label": "Card preview"
    },
    {
      "id": "delete",
      "label": "Delete confirmation"
    },
    {
      "id": "empty",
      "label": "No matches"
    }
  ],
  "/admin/coupons": [
    {
      "id": "populated",
      "label": "Coupon index"
    },
    {
      "id": "create",
      "label": "Create coupon"
    },
    {
      "id": "disabled",
      "label": "Disabled coupons"
    },
    {
      "id": "empty",
      "label": "No coupons"
    }
  ],
  "/admin/errors": [
    {
      "id": "unresolved",
      "label": "Unresolved errors"
    },
    {
      "id": "watching",
      "label": "Watching"
    },
    {
      "id": "selected",
      "label": "Selected error"
    },
    {
      "id": "fixed",
      "label": "Fixed errors"
    },
    {
      "id": "ignored",
      "label": "Ignored errors"
    },
    {
      "id": "empty",
      "label": "No errors"
    }
  ],
  "/admin/support": [
    {
      "id": "queue",
      "label": "Support queue"
    },
    {
      "id": "conversation",
      "label": "Conversation detail"
    },
    {
      "id": "resolved",
      "label": "Resolved requests"
    },
    {
      "id": "empty",
      "label": "Queue clear"
    }
  ],
  "/admin/users": [
    {
      "id": "populated",
      "label": "User index"
    },
    {
      "id": "filtered",
      "label": "Filtered users"
    },
    {
      "id": "empty",
      "label": "No matches"
    }
  ],
  "/admin/users/demo-user": [
    {
      "id": "overview",
      "label": "Account overview"
    },
    {
      "id": "cards",
      "label": "Customer cards"
    },
    {
      "id": "activity",
      "label": "Customer activity"
    },
    {
      "id": "email",
      "label": "Email customer"
    },
    {
      "id": "impersonate",
      "label": "View as user"
    },
    {
      "id": "cancel-subscription",
      "label": "Cancel subscription"
    }
  ],
  "/admin/visitors": [
    {
      "id": "overview",
      "label": "Visitor overview"
    },
    {
      "id": "identity-filtered",
      "label": "Identity filtered"
    },
    {
      "id": "live-empty",
      "label": "No live visitors"
    },
    {
      "id": "history-empty",
      "label": "No visitor history"
    },
    {
      "id": "refresh-error",
      "label": "Refresh failed"
    }
  ]
};
export const MBC_SYSTEM_ROUTE_PATHS: string[] = [
  "/preview/not-found",
  "/preview/error",
  "/unsupported-browser",
  "/preview/create-loading",
  "/preview/play-loading",
  "/b/DEMO",
  "/r/FRIEND",
  "/auth-new-user"
];
export function getMbcStates(route: string): MbcState[] {
  return MBC_STATES[route] || [];
}
