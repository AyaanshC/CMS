// Run with the hosting environment injected; never print credential values.
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(), false);
const errors=[];
for(const name of ['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','ALERTS_FROM_EMAIL']) {
  if(!process.env[name]?.trim()) errors.push(`${name} is missing`);
}
for(const name of ['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_SUPABASE_URL']) {
  try {
    const url=new URL(process.env[name]);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.hostname==='localhost'||url.hostname.endsWith('.test')||url.hostname.endsWith('.local')||url.hostname.endsWith('.example')||url.hostname==='example.com'||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)) errors.push(`${name} must be a public HTTPS origin`);
  }catch{errors.push(`${name} is not a valid URL`);}
}
if(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY===process.env.SUPABASE_SERVICE_ROLE_KEY) errors.push('Public and privileged Supabase keys must differ');
for(const name of Object.keys(process.env)) {
  if(name.startsWith('NEXT_PUBLIC_')&&/(SERVICE_ROLE|SECRET|PASSWORD|RESEND)/.test(name)) errors.push(`${name} exposes a privileged setting`);
}
if(/example\.(com|org)|\.test[>\s]*$/.test(process.env.ALERTS_FROM_EMAIL??'')) errors.push('ALERTS_FROM_EMAIL must use your verified sending domain');
if(errors.length){for(const error of errors)console.error(`BLOCKED: ${error}`);process.exitCode=1;}
else console.log('Environment checks passed. Provider verification, database migrations, backups, and end-to-end acceptance are still required.');
