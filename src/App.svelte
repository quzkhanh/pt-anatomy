<script lang="ts">
  import ReviewBar from './components/ReviewBar.svelte'
  import TabBar from './components/TabBar.svelte'
  import { app } from './lib/app-state.svelte'
  import BodyScreen from './screens/BodyScreen.svelte'
  import CreditsScreen from './screens/CreditsScreen.svelte'
  import ExercisesScreen from './screens/ExercisesScreen.svelte'
  import FavoritesScreen from './screens/FavoritesScreen.svelte'
  import MotionPreview from './screens/MotionPreview.svelte'

  const params = new URLSearchParams(location.search)
  const review = params.has('review')
  document.documentElement.classList.toggle('review', review)
</script>

{#if params.has('motion')}
  <MotionPreview />
{:else}
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
{/if}
