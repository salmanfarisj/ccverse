import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const UserRole = v.union(
  v.literal('BUYER'),
  v.literal('SELLER'),
  v.literal('AUDITOR'),
  v.literal('ADMIN'),
);

const UserStatus = v.union(
  v.literal('ACTIVE'),
  v.literal('SUSPENDED'),
  v.literal('BANNED'),
  v.literal('PENDING_VERIFICATION'),
);

const KycStatus = v.union(
  v.literal('NOT_STARTED'),
  v.literal('PENDING'),
  v.literal('APPROVED'),
  v.literal('REJECTED'),
  v.literal('EXPIRED'),
);

const KycDocumentType = v.union(
  v.literal('PAN'),
  v.literal('GSTIN'),
  v.literal('PASSPORT'),
  v.literal('UTILITY_BILL'),
  v.literal('BANK_STATEMENT'),
  v.literal('INCORPORATION_CERT'),
  v.literal('OTHER'),
);

const KycDocumentReviewStatus = v.union(
  v.literal('PENDING'),
  v.literal('APPROVED'),
  v.literal('REJECTED'),
);

const BuyerKycStatus = v.union(
  v.literal('NOT_REQUIRED'),
  v.literal('PENDING'),
  v.literal('APPROVED'),
  v.literal('REJECTED'),
  v.literal('EXPIRED'),
);

const BuyerKycMethod = v.union(v.literal('NONE'), v.literal('MANUAL'));

const DefaultCurrency = v.union(v.literal('INR'), v.literal('USD'));

const ProjectStatus = v.union(
  v.literal('DRAFT'),
  v.literal('PENDING_REVIEW'),
  v.literal('APPROVED'),
  v.literal('REJECTED'),
  v.literal('ACTIVE'),
  v.literal('RETIRED'),
);

const ListingStatus = v.union(
  v.literal('DRAFT'),
  v.literal('PENDING_AUDIT'),
  v.literal('ACTIVE'),
  v.literal('SOLD_OUT'),
  v.literal('ARCHIVED'),
);

const OrderStatus = v.union(
  v.literal('PENDING'),
  v.literal('PAID'),
  v.literal('FULFILLED'),
  v.literal('REFUNDED'),
  v.literal('CANCELLED'),
);

const PaymentStatus = v.union(
  v.literal('INITIATED'),
  v.literal('AUTHORIZED'),
  v.literal('CAPTURED'),
  v.literal('FAILED'),
  v.literal('REFUNDED'),
);

const CertificateStatus = v.union(v.literal('PENDING'), v.literal('ISSUED'), v.literal('REVOKED'));

const AuditDecisionStatus = v.union(
  v.literal('PENDING'),
  v.literal('APPROVED'),
  v.literal('REJECTED'),
  v.literal('NEEDS_REVISION'),
);

const DisputeStatus = v.union(
  v.literal('OPEN'),
  v.literal('UNDER_REVIEW'),
  v.literal('RESOLVED'),
  v.literal('REJECTED'),
);

const RegistryState = v.union(v.literal('AVAILABLE'), v.literal('HELD'), v.literal('RETIRED'));

const PayoutStatus = v.union(
  v.literal('PENDING'),
  v.literal('PROCESSING'),
  v.literal('PAID'),
  v.literal('FAILED'),
  v.literal('REVERSED'),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    role: UserRole,
    status: UserStatus,
    mfaEnabled: v.boolean(),
    mfaSecret: v.optional(v.string()),
    emailVerified: v.boolean(),
    emailVerifiedAt: v.optional(v.float64()),
    failedLoginCount: v.number(),
    lockedUntil: v.optional(v.float64()),
    lastLoginAt: v.optional(v.float64()),
    lastLoginIp: v.optional(v.string()),
    createdAt: v.float64(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_email', ['email']),

  sellerProfiles: defineTable({
    userId: v.id('users'),
    legalName: v.optional(v.string()),
    registrationNo: v.optional(v.string()),
    country: v.optional(v.string()),
    authorizedSignatoryName: v.optional(v.string()),
    authorizedSignatoryEmail: v.optional(v.string()),
    kycStatus: KycStatus,
    kycMethod: v.string(),
    kycReviewedBy: v.optional(v.id('users')),
    kycReviewedAt: v.optional(v.float64()),
    kycReviewNotes: v.optional(v.string()),
    bankAccountId: v.optional(v.id('bankAccounts')),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index('by_userId', ['userId'])
    .index('by_bankAccountId', ['bankAccountId']),

  buyerProfiles: defineTable({
    userId: v.id('users'),
    legalName: v.optional(v.string()),
    country: v.optional(v.string()),
    kycStatus: BuyerKycStatus,
    kycMethod: BuyerKycMethod,
    defaultCurrency: DefaultCurrency,
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index('by_userId', ['userId']),

  kycDocuments: defineTable({
    subjectUserId: v.id('users'),
    documentType: KycDocumentType,
    s3Key: v.string(),
    sha256: v.optional(v.string()),
    uploadedAt: v.float64(),
    uploadedById: v.id('users'),
    reviewStatus: KycDocumentReviewStatus,
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.float64()),
    reviewNotes: v.optional(v.string()),
  })
    .index('by_subjectUserId', ['subjectUserId'])
    .index('by_uploadedById', ['uploadedById']),

  bankAccounts: defineTable({
    userId: v.id('users'),
    accountHolder: v.string(),
    bankName: v.string(),
    accountNoLast4: v.string(),
    routingOrIfsc: v.string(),
    verified: v.boolean(),
    verifiedAt: v.optional(v.float64()),
    createdAt: v.float64(),
  }).index('by_userId', ['userId']),

  emailVerificationTokens: defineTable({
    token: v.string(),
    userId: v.id('users'),
    expiresAt: v.float64(),
    consumedAt: v.optional(v.float64()),
  }).index('by_userId', ['userId']),

  passwordResetTokens: defineTable({
    token: v.string(),
    userId: v.id('users'),
    expiresAt: v.float64(),
    consumedAt: v.optional(v.float64()),
    ip: v.optional(v.string()),
  }).index('by_userId', ['userId']),

  projects: defineTable({
    status: ProjectStatus,
    createdAt: v.float64(),
  }),

  projectRegistrations: defineTable({
    createdAt: v.float64(),
  }),

  listings: defineTable({
    status: ListingStatus,
    createdAt: v.float64(),
  }),

  orders: defineTable({
    status: OrderStatus,
    createdAt: v.float64(),
  }),

  payments: defineTable({
    status: PaymentStatus,
    createdAt: v.float64(),
  }),

  certificates: defineTable({
    status: CertificateStatus,
    createdAt: v.float64(),
  }),

  auditDecisions: defineTable({
    status: AuditDecisionStatus,
    createdAt: v.float64(),
  }),

  disputes: defineTable({
    status: DisputeStatus,
    createdAt: v.float64(),
  }),

  registryEntries: defineTable({
    state: RegistryState,
    cvcSerial: v.string(),
    createdAt: v.float64(),
  })
    .index('by_cvcSerial', ['cvcSerial'])
    .index('by_state', ['state']),

  cvcBatches: defineTable({
    createdAt: v.float64(),
  }),

  auditLogs: defineTable({
    actorId: v.optional(v.string()),
    actorRole: v.optional(v.string()),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    ip: v.optional(v.string()),
    timestamp: v.float64(),
    payload: v.string(),
  })
    .index('by_actorId', ['actorId'])
    .index('by_action', ['action'])
    .index('by_timestamp', ['timestamp']),

  payouts: defineTable({
    status: PayoutStatus,
    createdAt: v.float64(),
  }),

  platformConfigs: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.float64(),
  }),

  failedJobs: defineTable({
    jobType: v.string(),
    payload: v.string(),
    error: v.string(),
    attempts: v.number(),
    createdAt: v.float64(),
    failedAt: v.float64(),
  }).index('by_failedAt', ['failedAt']),
});
