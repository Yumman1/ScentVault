<!-- Add this inside index.html before closing </body> -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const supabaseUrl = "https://YOUR_PROJECT_ID.supabase.co";
  const supabaseKey = "YOUR_ANON_PUBLIC_KEY";

  const supabase = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  );
</script>
