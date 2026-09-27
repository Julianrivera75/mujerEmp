import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  'auth/me',
  'any',
  async (_req, user) => {
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        memberNumber: true,
        startDate: true,
        endDate: true,
        avatar: true,
        extraRoles: true,
        showOnlineStatus: true,
        emailNotifications: true,
      },
    });

    return NextResponse.json({ user: fullUser, mustChangePassword: user.mustChangePassword });
  },
  { allowPendingPasswordChange: true },
);
