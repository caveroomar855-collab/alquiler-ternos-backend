import dotenv from 'dotenv';

dotenv.config();

const fallbacks = {
  SUPABASE_URL: 'https://hqqprbxhfljarfptzsdb.supabase.co',
  SUPABASE_SERVICE_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcXByYnhoZmxqYXJmcHR6c2RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIzOTMzNCwiZXhwIjoyMDc4ODE1MzM0fQ.KKxzmxIJRYpfUT4PnD9WvLmBNn1OGoQHde9ZkjNst0s',
  JWT_SECRET: 'super-secret',
  JWT_EXPIRES_IN: '12h',
  REPORTS_BUCKET: 'reports',
};

const pick = (key) => process.env[key] ?? fallbacks[key] ?? undefined;

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
required.forEach((key) => {
  if (!pick(key)) {
    console.warn(`[config] Falta la variable de entorno ${key}`);
  }
});

export const config = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: pick('SUPABASE_URL') ?? '',
  supabaseServiceKey: pick('SUPABASE_SERVICE_KEY') ?? '',
  jwtSecret: pick('JWT_SECRET') ?? 'secret',
  jwtExpiresIn: pick('JWT_EXPIRES_IN') ?? '12h',
  reportsBucket: pick('REPORTS_BUCKET') ?? 'reports',
};
