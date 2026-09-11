import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Por favor, ingresa correo y contraseña.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' },
        { status: 401 }
      );
    }

    // Verificar si el usuario está INACTIVO
    if (user.status === 'INACTIVO') {
      return NextResponse.json(
        {
          error: 'Tu cuenta se encuentra INACTIVA. Comunícate con la administración de Empoderas Diversas para reactivar tu acceso.',
          inactive: true,
        },
        { status: 403 }
      );
    }

    // Verificar vigencia por fechas si están configuradas
    const now = new Date();
    if (user.startDate && new Date(user.startDate) > now) {
      return NextResponse.json(
        {
          error: `Tu periodo de formación inicia el ${new Date(user.startDate).toLocaleDateString('es-ES')}. Aún no tienes acceso habilitado.`,
        },
        { status: 403 }
      );
    }

    if (user.endDate && new Date(user.endDate) < now) {
      return NextResponse.json(
        {
          error: `Tu periodo de vinculación finalizó el ${new Date(user.endDate).toLocaleDateString('es-ES')}. Contacta al administrador.`,
        },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas. Verifica tu correo y contraseña.' },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'MENTOR' | 'STUDENT',
      status: user.status as 'ACTIVO' | 'INACTIVO',
    });

    setSessionCookie(token);

    let redirectUrl = '/estudiante';
    if (user.role === 'ADMIN') redirectUrl = '/admin';
    if (user.role === 'MENTOR') redirectUrl = '/mentor';

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error en el servidor. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
