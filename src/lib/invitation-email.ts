import "server-only";
export function invitationEmailConfigured(){return !!(process.env.RESEND_API_KEY&&process.env.ALERTS_FROM_EMAIL);}
export async function sendInvitationEmail(email:string,link:string){
 if(!invitationEmailConfigured())return {ok:false as const,error:"Email delivery is not configured. You can create and share a sign-in link instead."};
 try{const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.ALERTS_FROM_EMAIL,to:[email],subject:"Your studio workspace sign-in link",text:`Your studio has invited you to its workspace.\n\nOpen this one-time link to sign in:\n${link}\n\nIf the link expires, request a fresh sign-in link from the login page.`}),signal:AbortSignal.timeout(15000)});return response.ok?{ok:true as const}:{ok:false as const,error:"The email provider could not deliver this invitation. Create a link to share or try again."};}catch{return {ok:false as const,error:"Could not reach the email service. Please try again."};}
}
