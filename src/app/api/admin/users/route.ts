import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { HttpError, MAX_ROWS, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { createUserSchema, updateUserSchema } from '@/lib/schemas';
import { ROLES, USER_STATUSES, cleanText, isOneOf, validatePassword } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const BCRYPT_COST = 12;

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  documentId: true,
  phone: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  isMinor: true,
  guardianName: true,
  guardianContact: true,
  guardianConsentAt: true,
  termsAcceptedAt: true,
  anonymizedAt: true,
} as const;

export const GET = withAuth('admin/users GET', ['ADMIN'], async (req) => {
  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get('role');
  const statusFilter = searchParams.get('status');

  const where: { role?: string; status?: string } = {};
  if (roleFilter && isOneOf(ROLES, roleFilter)) where.role = roleFilter;
  if (statusFilter && isOneOf(USER_STATUSES, statusFilter)) where.status = statusFilter;

  const users = await prisma.user.findMany({
    where,
    select: {
      ...SAFE_USER_SELECT,
      _count: { select: { attendances: true, enrolledClasses: true, mentoredClasses: true, submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
  });

  return NextResponse.json({ users });
});

export const POST = withAuth('admin/users POST', ['ADMIN'], async (req) => {
  const body = await parseBody(req, createUserSchema);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new HttpError(409, 'Ya existe un usuario registrado con este correo.');

  const minor = Boolean(body.isMinor);
  const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST);

  const newUser = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role,
      status: body.status ?? 'ACTIVO',
      documentId: body.documentId,
      phone: body.phone,
      startDate: body.startDate,
      endDate: body.endDate,
      isMinor: minor,
      guardianName: minor ? cleanText(body.guardianName ?? '', 120) : null,
      guardianContact: minor ? cleanText(body.guardianContact ?? '', 120) : null,
      guardianConsentAt: minor && body.guardianConsent ? new Date() : null,
    },
    select: SAFE_USER_SELECT,
  });

  return NextResponse.json({ success: true, message: 'Usuario creado exitosamente.', user: newUser });
});

export const PUT = withAuth('admin/users PUT', ['ADMIN'], async (req, currentUser) => {
  const body = await parseBody(req, updateUserSchema);

  const target = await prisma.user.findUnique({ where: { id: body.id } });
  if (!target) throw new HttpError(404, 'Usuario no encontrado.');
  if (target.anonymizedAt) throw new HttpError(409, 'Esta cuenta fue anonimizada y no puede modificarse.');

  // Una administradora no puede quitarse a sí misma el acceso (dejaría el sistema sin administración).
  if (
    body.id === currentUser.id &&
    ((body.role !== undefined && body.role !== 'ADMIN') || body.status === 'INACTIVO')
  ) {
    throw new HttpError(400, 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta.');
  }

  if (body.email && body.email !== target.email) {
    const taken = await prisma.user.findUnique({ where: { email: body.email } });
    if (taken) throw new HttpError(409, 'Ya existe un usuario registrado con este correo.');
  }

  const minor = body.isMinor === undefined ? target.isMinor : Boolean(body.isMinor);

  const data: Prisma.UserUpdateInput = {
    name: cleanText(body.name ?? '', 120) ?? undefined,
    email: body.email,
    role: body.role,
    status: body.status,
    documentId: body.documentId,
    phone: body.phone,
    startDate: body.startDate,
    endDate: body.endDate,
    isMinor: minor,
    guardianName: minor ? cleanText(body.guardianName ?? '', 120) : null,
    guardianContact: minor ? cleanText(body.guardianContact ?? '', 120) : null,
  };

  if (!minor) {
    data.guardianConsentAt = null;
  } else if (body.guardianConsent === true && !target.guardianConsentAt) {
    data.guardianConsentAt = new Date();
  } else if (body.guardianConsent === false) {
    data.guardianConsentAt = null;
  }

  const newPassword = body.password?.trim();
  if (newPassword) {
    const passwordError = validatePassword(newPassword);
    if (passwordError) throw new HttpError(400, passwordError);
    data.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  }

  const updatedUser = await prisma.user.update({ where: { id: body.id }, data, select: SAFE_USER_SELECT });
  return NextResponse.json({ success: true, message: 'Usuario actualizado exitosamente.', user: updatedUser });
});
