export default function MissingConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border rounded-2xl p-8 shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-bold text-teal-700">SwapSmart</h1>
        <p className="text-slate-600 text-sm">
          Le site est en ligne, mais la connexion à la base de données n’est pas configurée sur GitHub
          Pages.
        </p>
        <p className="text-slate-500 text-xs text-left bg-slate-50 rounded-lg p-3">
          Dans le dépôt GitHub → <strong>Settings</strong> → <strong>Secrets and variables</strong> →{" "}
          <strong>Actions</strong>, ajoute :
          <br />
          <code className="block mt-2">VITE_SUPABASE_URL</code>
          <code className="block mt-1">VITE_SUPABASE_PUBLISHABLE_KEY</code>
          <br />
          Puis relance le workflow <strong>Deploy to GitHub Pages</strong>.
        </p>
      </div>
    </div>
  );
}
