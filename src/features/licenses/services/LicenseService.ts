import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function makeGroup(length: number) {
  return crypto
    .randomBytes(length)
    .toString("hex")
    .toUpperCase()
    .slice(0, length);
}

export function generateLicenseCode() {
  return `VIC-${makeGroup(4)}-${makeGroup(4)}-${makeGroup(4)}`;
}

export class LicenseService {
  async listLicenses() {
    return prisma.license.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        activatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async generateLicenses(durationDays: number, count: number) {
    const codes = new Set<string>();
    while (codes.size < count) {
      codes.add(generateLicenseCode());
    }

    const data = Array.from(codes).map((code) => ({
      code,
      durationDays,
    }));

    return prisma.license.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async activateLicense(userId: string, code: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "License" WHERE code = ${code} FOR UPDATE`;

      const license = await tx.license.findUnique({
        where: { code },
      });

      if (!license) {
        throw new Error("LICENSE_NOT_FOUND");
      }

      if (license.status !== "UNUSED") {
        throw new Error("LICENSE_ALREADY_USED");
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true, licenseExpiresAt: true },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user.status === "LOCKED") {
        throw new Error("USER_LOCKED");
      }

      const now = new Date();
      const baseTime =
        user.licenseExpiresAt && user.licenseExpiresAt > now
          ? user.licenseExpiresAt.getTime()
          : now.getTime();

      const newExpiration = new Date(
        baseTime + license.durationDays * 24 * 60 * 60 * 1000
      );

      await tx.license.update({
        where: { id: license.id },
        data: {
          status: "ACTIVATED",
          activatedAt: now,
          activatedByUserId: userId,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { licenseExpiresAt: newExpiration },
        select: { id: true, licenseExpiresAt: true },
      });

      return {
        code: license.code,
        durationDays: license.durationDays,
        licenseExpiresAt: updatedUser.licenseExpiresAt,
      };
    });
  }
}
