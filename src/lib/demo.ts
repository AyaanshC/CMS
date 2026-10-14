// Demo identities are never accepted by a production server or client bundle.
export const isDemoEnabled = () => process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";
export const isDemoEmail = (email: string) =>
  [
    "priya@studio.test",
    "vikram@studio.test",
    "ananya@studio.test",
    "meera@studio.test",
    "arun@client.test",
  ].includes(email);
