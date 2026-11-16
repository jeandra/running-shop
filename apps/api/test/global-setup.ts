import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: join(__dirname, '..', '.env') });

export default function globalSetup(): void {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL belum diisi di apps/api/.env');
  }

  execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
