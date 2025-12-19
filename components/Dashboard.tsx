<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Southport AI - Eric Wilson</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      body {
        font-family: 'Inter', sans-serif;
        background-color: #020617; /* Very Dark Slate/Blue */
        color: #f8fafc;
        margin: 0;
        min-height: 100vh;
        overflow-x: hidden;
      }
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #0f172a; 
      }
      ::-webkit-scrollbar-thumb {
        background: #334155; 
        border-radius: 10px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #475569; 
      }
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    </style>
    <script type="importmap">
{
  "imports": {
    "lucide-react": "https://esm.sh/lucide-react@0.454.0",
    "react": "https://esm.sh/react@18.2.0",
    "react-dom": "https://esm.sh/react-dom@18.2.0",
    "@google/genai": "https://esm.sh/@google/genai@0.2.1",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.7",
    "react-dom/": "https://esm.sh/react-dom@^19.2.3/",
    "vite": "https://esm.sh/vite@^7.3.0",
    "react/": "https://esm.sh/react@^19.2.3/",
    "@vitejs/plugin-react": "https://esm.sh/@vitejs/plugin-react@^5.1.2"
  }
}
</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
