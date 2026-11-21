<script lang="ts">
  import { onMount } from 'svelte'
  import ClassBoard from './ClassBoard.svelte'
  import ClassEditor from './ClassEditor.svelte'
  import Icon from './Icon.svelte'
  import { loadClasses, loadTheme, saveClasses, saveTheme, type Classroom, type Theme } from './classes'

  let classrooms = $state(loadClasses())
  let classId = $state(location.hash.slice(1))
  let selected = $derived(classrooms.find(classroom => classroom.id === classId))
  let storageFailed = $state(false)
  let theme = $state(loadTheme())
  let editor: ClassEditor
  const absences = new Map<string, string[]>()

  onMount(() => {
    const syncRoute = () => { classId = location.hash.slice(1) }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  })

  $effect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#15131d' : '#f6f4ee')
  })

  function changeTheme(next: Theme) {
    theme = next
    storageFailed = !saveTheme(next)
  }

  function saveClass(classroom: Classroom) {
    classrooms = classrooms.some(existing => existing.id === classroom.id)
      ? classrooms.map(existing => existing.id === classroom.id ? classroom : existing)
      : [...classrooms, classroom]
    storageFailed = !saveClasses(classrooms)
  }
</script>

{#snippet storageNotice()}
  {#if storageFailed}
    <p class="error storage-alert" role="alert">Changes are available for this visit. This browser couldn’t save them for next time.</p>
  {/if}
{/snippet}

<div class="shell">
  {#if selected}
    {@const classroom = selected}
    {#key classroom.id}
      <ClassBoard
        {classroom}
        {theme}
        {storageNotice}
        initialAbsences={absences.get(classroom.id) ?? []}
        onAttendance={ids => absences.set(classroom.id, ids)}
        onChange={saveClass}
        onThemeChange={changeTheme}
      />
    {/key}
  {:else}
    <header class="site-header">
      <a href="../" class="nav-link"><Icon name="home" size={18} /> Classroom Tools</a>
    </header>
    <main>
      {@render storageNotice()}
      <section class="intro" aria-labelledby="app-title">
        <div>
          <div class="intro-icon"><Icon name="shuffle" size={27} /></div>
          <h1 id="app-title">Class Group Shuffler</h1>
          <p>Turn a class list into groups with one shuffle.</p>
        </div>
        <div class="card-art" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      </section>

      <section class="classes" id="classes" aria-labelledby="classes-title">
        <div class="section-heading">
          <h2 id="classes-title">Your classes</h2>
          <button class="button primary" type="button" onclick={() => editor.open()}><Icon name="plus" /> New class</button>
        </div>
        {#if classrooms.length}
          <div class="class-list">
            {#each classrooms as classroom (classroom.id)}
              <article class="class-card">
                <div class="class-icon"><Icon name="groups" size={24} /></div>
                <div class="class-details">
                  <h3><a href={`#${classroom.id}`}>{classroom.name}</a></h3>
                  <p>{classroom.students.length} {classroom.students.length === 1 ? 'student' : 'students'}</p>
                </div>
                <button class="icon-button edit-class" type="button" aria-label={`Edit ${classroom.name}`} title={`Edit ${classroom.name}`} onclick={() => editor.open(classroom)}><Icon name="edit" size={19} /></button>
                <span class="class-arrow"><Icon name="arrow" /></span>
              </article>
            {/each}
          </div>
        {:else}
          <div class="empty-classes">
            <Icon name="groups" size={30} />
            <p>Add your first class to get started.</p>
          </div>
        {/if}
        <p class="local-note">Class lists and pairing rules are saved in this browser.</p>
      </section>
    </main>
  {/if}
</div>

<ClassEditor bind:this={editor} onSave={saveClass} />
