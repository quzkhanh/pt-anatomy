<script lang="ts">
  import Panel from '../components/Panel.svelte'
  import { app } from '../lib/app-state.svelte'
  import { exercises, muscles } from '../lib/content'
  import type { Source } from '../lib/content-types'

  const sources = [
    ...new Map(
      [...muscles, ...exercises].flatMap((item) => item.sources ?? []).map((s): [string, Source] => [s.url, s]),
    ).values(),
  ].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
</script>

<Panel title="Nguồn & giấy phép" onClose={() => (app.credits = false)}>
  <h2>Mô hình 3D</h2>
  <p>
    Mô hình cơ lấy từ <a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noopener">Z-Anatomy</a>,
    dựa trên <a href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noopener">BodyParts3D</a> (The Database Center for
    Life Science). Bản trong app đã lọc cơ, chỉ giữ nửa phải, giảm đa giác, thêm đầu trơn, thêm tấm che mỏng ở
    đường giữa thân và sửa tên hai phần cơ thang bị đặt ngược.
  </p>
  <p>
    File <code>body.glb</code> phát hành theo giấy phép
    <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>. Giấy phép này
    chỉ áp dụng cho mô hình, không áp dụng cho mã nguồn và nội dung chữ của app.
  </p>
  <h2>Phông chữ</h2>
  <p>
    <a href="https://github.com/bettergui/BeVietnamPro" target="_blank" rel="noopener">Be Vietnam Pro</a>, giấy phép
    <a href="https://openfontlicense.org" target="_blank" rel="noopener">SIL Open Font License 1.1</a>.
  </p>
  <h2>Nội dung</h2>
  <p>
    Chức năng cơ và bài tập do app tự soạn, viết lại bằng lời của mình dựa trên các nguồn dưới đây. Mục có nhãn “nháp” chưa
    được người duyệt xác nhận. Nội dung chỉ để tham khảo khi học và làm việc, không thay cho ý kiến chuyên môn y tế.
  </p>
  <h2>Tài liệu tham khảo ({sources.length})</h2>
  <ul>
    {#each sources as source (source.url)}
      <li><a href={source.url} target="_blank" rel="noopener">{source.title}</a></li>
    {/each}
  </ul>
</Panel>

<style>
  h2 {
    margin: var(--space-6) 0 var(--space-2);
    font-size: var(--font-md);
  }
  p,
  li {
    font-size: var(--font-sm);
    line-height: var(--line-body);
  }
  p {
    margin: 0 0 var(--space-3);
  }
  ul {
    margin: 0;
    padding-left: var(--space-4);
  }
  li {
    margin-bottom: var(--space-2);
    overflow-wrap: anywhere;
  }
</style>
