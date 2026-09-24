import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { ROLES, USER_STATUSES, cleanText, isOneOf, isValidEmail, parseDate, validatePassword } from '@/lib/validators';
import { logError } from '@/lib/log';

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

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    const where: { role?: string; status?: string } = {};
    if (roleFilter && roleFilter !== 'ALL' && isOneOf(ROLES, roleFilter)) where.role = roleFilter;
    if (statusFilter && statusFilter !== 'ALL' && isOneOf(USER_STATUSES, statusFilter)) where.status = statusFilter;

    const users = await prisma.user.findMany({
      where,
      select: {
        ...SAFE_USER_SELECT,
        _count: {
          select: { attendances: true, enrolledClasses: true, mentoredClasses: true, submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    logError('admin/users GET', error);
    return NextResponse.json({ error: 'Error al consultar usuarios.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      role,
      status,
      documentId,
      phone,
      startDate,
      endDate,
      isMinor,
      guardianName,
      guardianContact,
      guardianConsent,
    } = body;

    const cleanName = cleanText(name, 120);
    if (!cleanName || !email || !password || !role) {
      return NextResponse.json({ error: 'Nombre, email, contraseña y rol son obligatorios.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El correo electrónico no es válido.' }, { status: 400 });
    }
    if (!isOneOf(ROLES, role)) {
      return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });
    }
    if (status !== undefined && !isOneOf(USER_STATUSES, status)) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario registrado con este correo.' }, { status: 409 });
    }

    const minor = Boolean(isMinor);
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: normalizedEmail,
        passwordHash,
        role,
        status: status || 'ACTIVO',
        documentId: cleanText(documentId, 40),
        phone: cleanText(phone, 30),
        startDate: parseDate(startDate),
        endDate: parseDate(endDate),
        isMinor: minor,
        guardianName: minor ? cleanText(guardianName, 120) : null,
        guardianContact: minor ? cleanText(guardianContact, 120) : null,
        guardianConsentAt: minor && guardianConsent ? new Date() : null,
      },
      select: SAFE_USER_SELECT,
    });

    return NextResponse.json({ success: true, message: 'Usuario creado exitosamente.', user: newUser });
  } catch (error) {
    logError('admin/users POST', error);
    return NextResponse.json({ error: 'Error al crear usuario.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      email,
      password,
      role,
      status,
      documentId,
      phone,
      startDate,
      endDate,
      isMinor,
      guardianName,
      guardianContact,
      guardianConsent,
    } = body;

    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }
    if (target.anonymizedAt) {
      return NextResponse.json({ error: 'Esta cuenta fue anonimizada y no puede modificarse.' }, { status: 409 });
    }

    if (role !== undefined && !isOneOf(ROLES, role)) {
      return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });
    }
    if (status !== undefined && !isOneOf(USER_STATUSES, status)) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }
    if (email !== undefined && !isValidEmail(email)) {
      return NextResponse.json({ error: 'El correo electrónico no es válido.' }, { status: 400 });
    }

    // Una administradora no puede quitarse a sí misma el acceso (dejaría el sistema sin administración).
    if (id === currentUser.id && ((role !== undefined && role !== 'ADMIN') || status === 'INACTIVO')) {
      return NextResponse.json(
        { error: 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta.' },
        { status: 400 },
      );
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
    if (normalizedEmail && normalizedEmail !== target.email) {
      const taken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (taken) {
        return NextResponse.json({ error: 'Ya existe un usuario registrado con este correo.' }, { status: 409 });
      }
    }

    const minor = isMinor === undefined ? target.isMinor : Boolean(isMinor);

    const dataToUpdate: Record<string, unknown> = {
      name: cleanText(name, 120) ?? undefined,
      email: normalizedEmail,
      role,
      status,
      documentId: cleanText(documentId, 40),
      phone: cleanText(phone, 30),
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      isMinor: minor,
      guardianName: minor ? cleanText(guardianName, 120) : null,
      guardianContact: minor ? cleanText(guardianContact, 120) : null,
    };

    if (!minor) {
      dataToUpdate.guardianConsentAt = null;
    } else if (guardianConsent === true && !target.guardianConsentAt) {
      dataToUpdate.guardianConsentAt = new Date();
    } else if (guardianConsent === false) {
      dataToUpdate.guardianConsentAt = null;
    }

    if (typeof password === 'string' && password.trim().length > 0) {
      const passwordError = validatePassword(password.trim());
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
      dataToUpdate.passwordHash = await bcrypt.hash(password.trim(), BCRYPT_COST);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: SAFE_USER_SELECT,
    });

    return NextResponse.json({ success: true, message: 'Usuario actualizado exitosamente.', user: updatedUser });
  } catch (error) {
    logError('admin/users PUT', error);
    return NextResponse.json({ error: 'Error al actualizar usuario.' }, { status: 500 });
  }
}
