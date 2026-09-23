import { NextResponse } from 'next/server';
import { executeSql } from '@/db';
import { hashPassword, createSession } from '@/server/auth';

export async function POST(req: Request) {
  try {
    const { email, password, name, phone } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await executeSql('SELECT id FROM users WHERE email = $1;', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userRes = await executeSql(
      `INSERT INTO users (email, password_hash, name, phone, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, email, name, role;`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), phone || null]
    );

    const user = userRes.rows[0];
    await createSession(user);

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
