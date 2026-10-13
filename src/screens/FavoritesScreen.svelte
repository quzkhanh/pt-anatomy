<script lang="ts">
  import ExerciseList from '../components/ExerciseList.svelte'
  import Panel from '../components/Panel.svelte'
  import { favorites } from '../lib/favorites.svelte'

  let { hidden }: { hidden: boolean } = $props()
</script>

<Panel title="Yêu thích" {hidden}>
  <ExerciseList exercises={favorites.list()} empty="Bấm ☆ ở bài tập để lưu vào đây" />
</Panel>
