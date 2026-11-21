<script lang="ts">
  import { onDestroy, untrack, type Snippet } from 'svelte'
  import { flip } from 'svelte/animate'
  import { crossfade } from 'svelte/transition'
  import { shouldReduceMotion } from '../../../packages/motion-preference/index'
  import Icon from './Icon.svelte'
  import { defaultNameDisplay, studentLabels, type Classroom, type NameDisplay, type PairingRule, type Theme } from './classes'
  import { makeGroups, shuffled } from './groups'
  import { fitStudentName } from './fitStudentName'

  let { classroom, theme, storageNotice, initialAbsences, onAttendance, onChange, onThemeChange }: {
    classroom: Classroom
    theme: Theme
    storageNotice: Snippet
    initialAbsences: string[]
    onAttendance: (ids: string[]) => void
    onChange: (classroom: Classroom) => void
    onThemeChange: (theme: Theme) => void
  } = $props()
  let absent = $state(untrack(() => initialAbsences))
  let present = $derived(classroom.students.filter(student => !absent.includes(student.id)).map(student => student.id))
  let labels = $derived(studentLabels(classroom.students))
  let nameDisplay = $derived(classroom.nameDisplay ?? defaultNameDisplay)
  let cardLabels = $derived(studentLabels(classroom.students, nameDisplay))
  let order = $state<string[]>()
  let groups = $state<string[][]>()
  let shuffling = $state(false)
  let error = $state('')
  let countInput = $state('')
  let firstStudent = $state('')
  let secondStudent = $state('')
  let ruleKind = $state<PairingRule['kind']>('together')
  let ruleError = $state('')
  let attendanceDialog: HTMLDialogElement
  let settingsDialog: HTMLDialogElement
  let roundTimer: ReturnType<typeof setTimeout>

  const nameOptions: { value: NameDisplay; text: string; example: string }[] = [
    { value: 'full', text: 'Show full name', example: 'Jane Doe' },
    { value: 'first', text: 'Show first name', example: 'Jane' },
    { value: 'initial', text: 'Show first name and initial', example: 'Jane D.' },
  ]

  const animationDuration = (duration: number) => shouldReduceMotion() ? 0 : duration
  const [send, receive] = crossfade({ duration: () => animationDuration(510) })
  onDestroy(() => clearTimeout(roundTimer))

  function clearBoard() {
    order = undefined
    groups = undefined
    error = ''
  }

  function setAttendance(ids: string[]) {
    absent = ids
    onAttendance(ids)
    clearBoard()
  }

  function toggleAttendance(id: string, checked: boolean) {
    setAttendance(checked ? absent.filter(other => other !== id) : [...absent, id])
  }

  function openSettings() {
    countInput = String(classroom.groupCount)
    firstStudent = ''
    secondStudent = ''
    ruleKind = 'together'
    ruleError = ''
    settingsDialog.showModal()
  }

  function changeGroupCount(value: string) {
    countInput = value
    const count = Number(value)
    if (!Number.isInteger(count) || count < 1 || count > classroom.students.length || count === classroom.groupCount) return
    onChange({ ...classroom, groupCount: count })
    clearBoard()
  }

  function saveRules(rules: PairingRule[]) {
    onChange({ ...classroom, rules })
    ruleError = ''
    clearBoard()
  }

  function addRule(event: SubmitEvent) {
    event.preventDefault()
    if (!firstStudent || !secondStudent || firstStudent === secondStudent) return
    if (classroom.rules.some(rule => rule.students.includes(firstStudent) && rule.students.includes(secondStudent))) {
      ruleError = 'These students already have a pairing rule. Remove it to choose a different rule.'
      return
    }
    saveRules([...classroom.rules, { kind: ruleKind, students: [firstStudent, secondStudent] }])
    firstStudent = ''
    secondStudent = ''
  }

  function shuffleGroups() {
    const result = makeGroups(present, classroom.groupCount, classroom.rules)
    if ('reason' in result) {
      error = {
        contradictory: 'Some pairing rules require the same students to work both together and apart. Review the rules in Settings.',
        impossible: 'No balanced groups fit the current pairing rules. Try a different group count or edit the rules in Settings.',
        limit: 'The shuffle couldn’t find a grouping for these rules. Try again or simplify the rules in Settings.',
      }[result.reason]
      return
    }

    const nextGroups = result.groups
    error = ''
    if (shouldReduceMotion()) {
      groups = nextGroups
      return
    }

    shuffling = true
    order = groups?.flat() ?? order ?? present
    groups = undefined

    function animateRound(remaining: number) {
      if (remaining === 0) {
        groups = nextGroups
        shuffling = false
        return
      }
      order = shuffled(present)
      roundTimer = setTimeout(() => animateRound(remaining - 1), 410)
    }

    // Render the ungrouped cards before measuring their first shuffle movement.
    roundTimer = setTimeout(() => animateRound(3), 0)
  }
</script>

<header class="site-header class-header">
  <a href="#classes" class="icon-button panel-button" aria-label="All classes" title="All classes">
    <Icon name="door" size={24} />
  </a>
  <div class="board-title">
    <h1 id="class-title">{classroom.name}</h1>
    <p>{present.length} of {classroom.students.length} present</p>
  </div>
  <div class="board-tools">
    <button class="button primary" type="button" onclick={shuffleGroups} disabled={shuffling || present.length === 0}>
      <Icon name="shuffle" size={20} /> Shuffle
    </button>
    <button class="button secondary" type="button" onclick={() => attendanceDialog.showModal()} disabled={shuffling}>
      <Icon name="groups" size={19} /> Attendance
    </button>
    <button class="icon-button panel-button" type="button" aria-label="Settings" title="Settings" onclick={openSettings} disabled={shuffling}>
      <Icon name="settings" size={22} />
    </button>
  </div>
</header>

<main aria-labelledby="class-title">
  {@render storageNotice()}
  <p class="visually-hidden" role="status">{shuffling ? 'Shuffling cards…' : groups ? 'Groups ready.' : ''}</p>
  <div class="board" aria-busy={shuffling}>
    {#if error}<p class="error board-error" role="alert">{error}</p>{/if}

    <div class="board-stage" class:has-groups={Boolean(groups)}>
      {#if groups}
        <div class="group-grid">
          {#each groups as group, index}
            <section class="group" aria-labelledby={`group-${index}`}>
              <h2 id={`group-${index}`}>Group {index + 1}</h2>
              <ul>
                {#each group as id (id)}
                  <li class="student-card" in:receive|global={{ key: id }}>
                    {@render studentName(cardLabels.get(id))}
                  </li>
                {/each}
              </ul>
            </section>
          {/each}
        </div>
      {:else if present.length}
        <ul class="student-grid" aria-label="Students present">
          {#each (order ?? present) as id (id)}
            <li class="student-card" animate:flip={{ duration: animationDuration(380) }} out:send|global={{ key: id }}>
              {@render studentName(cardLabels.get(id))}
            </li>
          {/each}
        </ul>
      {:else}
        <div class="empty-board">Mark students present in Attendance to start a shuffle.</div>
      {/if}
    </div>
  </div>
</main>

{#snippet studentName(name: string | undefined)}
  <span class="student-name" use:fitStudentName={name}>{name}</span>
{/snippet}

<dialog bind:this={attendanceDialog} aria-labelledby="attendance-title">
  <header class="dialog-heading">
    <h2 id="attendance-title">Attendance</h2>
    <button class="icon-button" type="button" aria-label="Close attendance" onclick={() => attendanceDialog.close()}><Icon name="close" /></button>
  </header>
  <div class="dialog-body">
    <p class="field-hint">Uncheck anyone who is absent. Changes apply as you go.</p>
    <div class="attendance-list">
      {#each classroom.students as { id } (id)}
        <label class="attendance-row">
          <input type="checkbox" checked={!absent.includes(id)} onchange={event => toggleAttendance(id, event.currentTarget.checked)} />
          <span>{labels.get(id)}</span>
        </label>
      {/each}
    </div>
  </div>
  <footer class="dialog-footer attendance-footer">
    <span>{present.length} present</span>
    <button class="button secondary" type="button" disabled={!absent.length} onclick={() => setAttendance([])}>Mark all present</button>
  </footer>
</dialog>

<dialog bind:this={settingsDialog} aria-labelledby="settings-title">
  <header class="dialog-heading">
    <h2 id="settings-title">Group settings</h2>
    <button class="icon-button" type="button" aria-label="Close settings" onclick={() => settingsDialog.close()}><Icon name="close" /></button>
  </header>
  <div class="dialog-body settings-body">
    <label class="theme-setting">
      <strong>Appearance</strong>
      <select value={theme} onchange={event => onThemeChange(event.currentTarget.value === 'light' ? 'light' : 'dark')}>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </label>

    <fieldset class="name-setting">
      <legend>Names on cards</legend>
      {#each nameOptions as option (option.value)}
        <label class="name-option">
          <input type="radio" name="name-display" value={option.value} checked={nameDisplay === option.value}
            onchange={() => onChange({ ...classroom, nameDisplay: option.value })} />
          <span>{option.text}<span class="field-hint">{option.example}</span></span>
        </label>
      {/each}
    </fieldset>

    <div class="count-setting">
      <label for="group-count">
        <strong>Number of groups</strong>
        <span class="field-hint" id="group-count-help">Groups are as even as possible. With fewer students present, the app makes fewer groups.</span>
      </label>
      <input id="group-count" type="number" min="1" max={classroom.students.length} step="1" value={countInput} aria-describedby="group-count-help"
        oninput={event => changeGroupCount(event.currentTarget.value)}
        onblur={() => { countInput = String(classroom.groupCount) }}
      />
    </div>

    <section class="pair-settings" aria-labelledby="rules-title">
      <h3 id="rules-title">Pairing rules</h3>
      <p class="field-hint">Rules apply when both students are present.</p>
      {#if classroom.students.length < 2}
        <p class="field-hint">Add another student to set a pairing rule.</p>
      {:else}
        <form class="pair-form" onsubmit={addRule}>
          <label class="field">
            First student
            <select bind:value={firstStudent} required>
              <option value="">Choose a student</option>
              {#each classroom.students as { id } (id)}
                <option value={id} disabled={id === secondStudent}>{labels.get(id)}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            Second student
            <select bind:value={secondStudent} required>
              <option value="">Choose a student</option>
              {#each classroom.students as { id } (id)}
                <option value={id} disabled={id === firstStudent}>{labels.get(id)}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            Rule
            <select bind:value={ruleKind}>
              <option value="together">Must work together</option>
              <option value="apart">Cannot work together</option>
            </select>
          </label>
          <button class="button primary" type="submit" disabled={!firstStudent || !secondStudent}>Add rule</button>
        </form>
        {#if ruleError}<p class="error" role="alert">{ruleError}</p>{/if}
      {/if}

      {#if classroom.rules.length}
        <ul class="rule-list">
          {#each classroom.rules as rule, index (rule.students.join(','))}
            {@const pair = `${labels.get(rule.students[0])} and ${labels.get(rule.students[1])}`}
            <li>
              <div>
                <strong>{pair}</strong>
                <span class="field-hint">{rule.kind === 'together' ? 'Must work together' : 'Cannot work together'}</span>
              </div>
              <button class="icon-button" type="button" aria-label={`Remove rule for ${pair}`} onclick={() => saveRules(classroom.rules.filter((_, position) => position !== index))}>
                <Icon name="close" size={16} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
</dialog>
