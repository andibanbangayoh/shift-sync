import { vi } from "vitest";

export const mockPrismaService = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  refreshToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  managerLocation: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => {
    if (typeof fn === "function") {
      return fn(mockPrismaService);
    }
    return Promise.all(fn);
  }),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

export function resetPrismaMocks() {
  Object.values(mockPrismaService).forEach((model) => {
    if (typeof model === "object" && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === "function" && "mockReset" in method) {
          (method as any).mockReset();
        }
      });
    }
  });
}
