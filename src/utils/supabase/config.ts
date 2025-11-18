// Supabase configuration
// For production deployment, use environment variables
// For Figma Make, use the info.tsx file

let projectId: string;
let publicAnonKey: string;

// Check if we're in a Vite environment (production/development)
if (import.meta.env) {
  projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
  publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  // Fallback to info.tsx if env vars are not set (Figma Make environment)
  if (!projectId || !publicAnonKey) {
    try {
      const info = await import('./info.tsx');
      projectId = info.projectId;
      publicAnonKey = info.publicAnonKey;
    } catch (e) {
      // Failed to load Supabase configuration
    }
  }
} else {
  // Fallback for non-Vite environments
  try {
    const info = await import('./info.tsx');
    projectId = info.projectId;
    publicAnonKey = info.publicAnonKey;
  } catch (e) {
    // Failed to load Supabase configuration
    projectId = '';
    publicAnonKey = '';
  }
}

export { projectId, publicAnonKey };
