<script lang="ts">
  import { tick } from 'svelte'
  import Icon from './Icon.svelte'
  import { makeStudent, parseNames, type Classroom, type Student } from './classes'

  let { onSave }: { onSave: (classroom: Classroom) => void } = $props()
  let dialog: HTMLDialogElement
  let nameInput: HTMLInputElement
  let original = $state<Classroom>()
  let name = $state('')
  let students = $state<Student[]>([])
  let additions = $state('')
  let error = $state('')

  export async function open(classroom?: Classroom) {
    original = classroom
    name = classroom?.name ?? ''
    students = classroom?.students.map(student => ({ ...student })) ?? []
    additions = ''
    error = ''
    await tick()
    dialog.showModal()
    nameInput.focus()
  }

  function save(event: SubmitEvent) {
    event.preventDefault()
    const roster = [
      ...students.map(student => ({ ...student, name: student.name.trim() })),
      ...parseNames(additions).map(makeStudent),
    ]
    if (!name.trim() || !roster.length || roster.some(student => !student.name)) {
      error = 'Enter a class name and at least one student. Fill in each student name or remove the blank row.'
      return
    }

    const ids = new Set(roster.map(student => student.id))
    onSave({
      id: original?.id ?? crypto.randomUUID(),
      name: name.trim(),
      students: roster,
      groupCount: Math.min(original?.groupCount ?? 4, roster.length),
      nameDisplay: original?.nameDisplay,
      rules: original?.rules.filter(rule => rule.students.every(id => ids.has(id))) ?? [],
    })
    dialog.close()
  }
</script>

<dialog bind:this={dialog} aria-labelledby="class-editor-title">
  <form onsubmit={save}>
    <header class="dialog-heading">
      <h2 id="class-editor-title">{original ? 'Edit class' : 'New class'}</h2>
      <button class="icon-button" type="button" aria-label="Close class editor" onclick={() => dialog.close()}><Icon name="close" /></button>
    </header>
    <div class="dialog-body">
      <label class="field">
        Class name
        <input bind:this={nameInput} bind:value={name} placeholder="e.g. Grade 6" required />
      </label>

      {#if original && students.length}
        <fieldset class="edit-students">
          <legend>Current students</legend>
          {#each students as student, index (student.id)}
            <div class="student-edit-row">
              <input aria-label={`Student ${index + 1} name`} bind:value={student.name} required />
              <button class="icon-button" type="button" aria-label={`Remove student ${index + 1}, ${student.name}`} onclick={() => students = students.filter(row => row.id !== student.id)}>
                <Icon name="close" size={16} />
              </button>
            </div>
          {/each}
        </fieldset>
      {/if}

      <label class="field">
        {original ? 'Add students' : 'Student names'}
        <span class="field-hint">Enter one student per line or paste rows from a spreadsheet or table.</span>
        <textarea bind:value={additions} rows={original ? 3 : 7} placeholder={'Avery\nJordan\nSam'}></textarea>
      </label>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
    </div>
    <footer class="dialog-footer">
      <button class="button primary" type="submit">{original ? 'Save class' : 'Create class'}</button>
    </footer>
  </form>
</dialog>
