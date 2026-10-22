import crypto from 'node:crypto';
import mongoose from 'mongoose';
const digest = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export async function issueSession(user: any) {
  const token = crypto.randomBytes(32).toString('hex');
  await mongoose.connection.collection('sessions').insertOne({ tokenHash: digest(token), userId: user._id, expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) });
  return token;
}
export async function sessionUser(token?: string): Promise<any> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await mongoose.connection.collection('sessions').findOne({ tokenHash: digest(token), expiresAt: { $gt: new Date() } });
  return session ? mongoose.model('User').findById(session.userId) : null;
}
export async function revokeSession(token?: string) {
  if (token) await mongoose.connection.collection('sessions').deleteOne({ tokenHash: digest(token) });
}
