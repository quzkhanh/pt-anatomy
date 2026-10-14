// The one place the wide breakpoint lives: CSS keys off the `wide` class on <html>, scripts off `layout.wide`.
const query = matchMedia('(min-width: 900px)')

export const layout = $state({ wide: query.matches })

function apply(wide: boolean) {
  layout.wide = wide
  document.documentElement.classList.toggle('wide', wide)
}

apply(query.matches)
query.addEventListener('change', (e) => apply(e.matches))
