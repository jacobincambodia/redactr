<script>
  import '../styles/app.css';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    // Load saved theme preference from localStorage if present
    const saved = localStorage.getItem('redactr.theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
    // If saved === 'system' or null, leave data-theme unset and let prefers-color-scheme handle it
  });
</script>

{@render children()}
