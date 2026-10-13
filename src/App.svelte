<script lang="ts">
  import ReviewBar from './components/ReviewBar.svelte'
  import TabBar from './components/TabBar.svelte'
  import { app } from './lib/app-state.svelte'
  import BodyScreen from './screens/BodyScreen.svelte'
  import CreditsScreen from './screens/CreditsScreen.svelte'
  import ExercisesScreen from './screens/ExercisesScreen.svelte'
  import FavoritesScreen from './screens/FavoritesScreen.svelte'

  const review = new URLSearchParams(location.search).has('review')
  document.documentElement.classList.toggle('review', review)
</script>

<BodyScreen hidden={app.tab !== 'body'} showHint={!review} />
{#if review}
  <ReviewBar />
{:else}
  <ExercisesScreen hidden={app.tab !== 'exercises'} />
  <FavoritesScreen hidden={app.tab !== 'favorites'} />
  <TabBar />
{/if}
{#if app.credits}
  <CreditsScreen />
{/if}
