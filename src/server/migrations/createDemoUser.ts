import { dbUsers } from 'modelence/server';

export async function createDemoUser() {
  const email = 'demo@modelence.dev';
  try {
    await dbUsers.deleteOne({ handle: email });
    await dbUsers.deleteOne({ 'emails.address': email });
    await dbUsers.deleteOne({ handle: 'demo' });
  } catch (err) {
    console.error('Error removing demo user:', err);
  }
}

