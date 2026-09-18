import { createHash, randomInt, randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

const smtpHost = defineSecret('SMTP_HOST');
const smtpPort = defineSecret('SMTP_PORT');
const smtpUser = defineSecret('SMTP_USER');
const smtpPassword = defineSecret('SMTP_PASSWORD');
const smtpFrom = defineSecret('SMTP_FROM');
const resetHashSecret = defineSecret('RESET_HASH_SECRET');

const CODE_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizedEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashValue(value: string): string {
  return createHash('sha256')
    .update(`${value}:${resetHashSecret.value()}`)
    .digest('hex');
}

function emailKey(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

function mailer(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: smtpHost.value(),
    port: Number(smtpPort.value() || 587),
    secure: Number(smtpPort.value() || 587) === 465,
    auth: {
      user: smtpUser.value(),
      pass: smtpPassword.value(),
    },
  });
}

async function sendCode(email: string, code: string): Promise<void> {
  await mailer().sendMail({
    from: smtpFrom.value(),
    to: email,
    subject: 'Pokédex Quiz Password Reset',
    text: [
      'Your Pokédex Quiz password reset verification code is:',
      '',
      code,
      '',
      'This code expires in 10 minutes. Do not share it with anyone.',
      '',
      'Pokédex Quiz / Full Marks Co., Ltd.',
    ].join('\n'),
  });
}

export const requestPasswordResetCode = onCall(
  {
    secrets: [
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFrom,
      resetHashSecret,
    ],
  },
  async (request) => {
    const email = normalizedEmail(request.data?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError('invalid-argument', 'Invalid email.');
    }

    const resetId = randomUUID();
    const code = String(randomInt(100000, 1000000));
    const now = Date.now();
    const rateRef = db.collection('passwordResetRateLimits').doc(emailKey(email));
    const rateSnapshot = await rateRef.get();
    const lastRequestedAt = rateSnapshot.data()?.lastRequestedAt?.toMillis?.() ?? 0;
    const rateLimited = now - lastRequestedAt < RESEND_COOLDOWN_MS;

    let accountExists = true;
    try {
      await auth.getUserByEmail(email);
    } catch (error) {
      accountExists = (error as { code?: string }).code !== 'auth/user-not-found';
    }

    const resetRef = db.collection('passwordResetTokens').doc(resetId);
    const previousTokens = await db
      .collection('passwordResetTokens')
      .where('email', '==', email)
      .get();
    const activePreviousTokens = previousTokens.docs.filter(
      (token) => token.data().used === false,
    );
    if (activePreviousTokens.length) {
      const batch = db.batch();
      activePreviousTokens.forEach((token) => {
        batch.update(token.ref, {
          used: true,
          invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    await resetRef.set({
      email,
      codeHash: hashValue(`${resetId}:${code}`),
      createdAt: admin.firestore.Timestamp.fromMillis(now),
      expiresAt: admin.firestore.Timestamp.fromMillis(now + CODE_TTL_MS),
      attempts: 0,
      verified: false,
      used: false,
    });

    if (!rateLimited) {
      await rateRef.set(
        { lastRequestedAt: admin.firestore.Timestamp.fromMillis(now) },
        { merge: true },
      );
    }

    if (accountExists && !rateLimited) {
      try {
        await sendCode(email, code);
      } catch (error) {
        const safeError = error as { code?: string; message?: string };
        console.error('[password-reset] recovery email delivery failed', {
          code: safeError.code ?? 'unknown',
          message: safeError.message ?? 'Unknown mail delivery error',
        });
        await resetRef.delete();
        throw new HttpsError('internal', 'Unable to send recovery email.');
      }
    }

    // Always return the same shape so the client cannot enumerate accounts.
    return { resetId };
  },
);

export const verifyPasswordResetCode = onCall(
  { secrets: [resetHashSecret] },
  async (request) => {
    const resetId = typeof request.data?.resetId === 'string' ? request.data.resetId : '';
    const code = typeof request.data?.code === 'string' ? request.data.code : '';
    if (!resetId || !/^\d{6}$/.test(code)) {
      throw new HttpsError('invalid-argument', 'Invalid verification code.');
    }

    const resetRef = db.collection('passwordResetTokens').doc(resetId);
    const snapshot = await resetRef.get();
    const data = snapshot.data();
    const expiresAt = data?.expiresAt?.toMillis?.() ?? 0;
    const attempts = typeof data?.attempts === 'number' ? data.attempts : MAX_ATTEMPTS;

    if (!snapshot.exists || data?.used || data?.verified || Date.now() > expiresAt || attempts >= MAX_ATTEMPTS) {
      throw new HttpsError('permission-denied', 'Invalid or expired verification code.');
    }

    const expectedHash = hashValue(`${resetId}:${code}`);
    if (expectedHash !== data?.codeHash) {
      await resetRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
      throw new HttpsError('permission-denied', 'Invalid or expired verification code.');
    }

    const resetToken = randomUUID();
    await resetRef.update({
      verified: true,
      resetTokenHash: hashValue(resetToken),
      resetTokenExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + RESET_TOKEN_TTL_MS),
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { resetToken };
  },
);

export const completePasswordReset = onCall(
  { secrets: [resetHashSecret] },
  async (request) => {
    const resetToken = typeof request.data?.resetToken === 'string' ? request.data.resetToken : '';
    const password = typeof request.data?.password === 'string' ? request.data.password : '';
    if (!resetToken || password.length < 6) {
      throw new HttpsError('invalid-argument', 'Invalid password reset request.');
    }

    const tokenHash = hashValue(resetToken);
    const snapshot = await db.collection('passwordResetTokens')
      .where('resetTokenHash', '==', tokenHash)
      .limit(1)
      .get();
    const tokenDocument = snapshot.docs[0];
    const data = tokenDocument?.data();
    const expiresAt = data?.resetTokenExpiresAt?.toMillis?.() ?? 0;

    if (!tokenDocument || data?.used || !data?.verified || Date.now() > expiresAt) {
      throw new HttpsError('permission-denied', 'Reset session expired.');
    }

    const user = await auth.getUserByEmail(data.email);
    await auth.updateUser(user.uid, { password });
    await tokenDocument.ref.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  },
);
