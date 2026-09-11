import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    const where: any = {};
    if (roleFilter && roleFilter !== 'ALL') {
      where.role = roleFilter;
    }
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
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
        _count: {
          select: {
            attendances: true,
            enrolledClasses: true,
            mentoredClasses: true,
            submissions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
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
    const { name, email, password, role, status, documentId, phone, startDate, endDate } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Nombre, email, contraseña y rol son obligatorios.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario registrado con este correo.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: role as string,
        status: status || 'ACTIVO',
        documentId: documentId?.trim() || null,
        phone: phone?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
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
    const { id, name, email, password, role, status, documentId, phone, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const dataToUpdate: any = {
      name: name?.trim(),
      email: email?.trim().toLowerCase(),
      role: role,
      status: status,
      documentId: documentId?.trim() || null,
      phone: phone?.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    if (password && password.trim().length > 0) {
      dataToUpdate.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario.' }, { status: 500 });
  }
}
