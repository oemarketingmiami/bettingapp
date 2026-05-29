/** @type {import('next').NextConfig} */
const nextConfig = {
  // The model/forecasting service and edge functions live outside the Next build.
  outputFileTracingExcludes: { "*": ["services/**", "supabase/**"] },
};
export default nextConfig;
