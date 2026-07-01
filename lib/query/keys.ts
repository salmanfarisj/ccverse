export const qk = {
  marketplace: ['marketplace'] as const,
  listing: (id: string) => ['listing', id] as const,
  registry: ['registry'] as const,
  buyerOrders: ['buyerOrders'] as const,
  sellerDashboard: ['sellerDashboard'] as const,
  sellerProjects: ['sellerProjects'] as const,
  sellerKyc: ['sellerKyc'] as const,
  me: ['me'] as const,
  adminKyc: ['adminKyc'] as const,
  adminKycDetail: (userId: string) => ['adminKyc', userId] as const,
  certificate: (certId: string) => ['certificate', certId] as const,
};
