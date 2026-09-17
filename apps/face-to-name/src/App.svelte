<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { answerQuestion, completedPeople, directions, MAX_PACKAGE_BYTES, newSet, nextQuestion, normalizeName, parseSet, reconcileProgress, setErrors, validId, type FaceSet, type Mode, type Progress, type Question } from './model'
  import { localSets, preparePhoto, removeSet, storeSet } from './storage'

  type View = 'home' | 'builder' | 'gallery' | 'practice' | 'complete'
  type Upload = { id: string; filename: string; photo: string; name: string; personId: string }
  let view: View = 'home'
  let sets: FaceSet[] = []
  let active: FaceSet | null = null
  let published = false
  let loading = true
  let busy = false
  let error = ''
  let notice = ''
  let saveStatus = ''
  let queue: Upload[] = []
  let mode: Mode = 'mixed'
  let progress: Progress | null = null
  let question: Question | null = null
  let selected: string | null = null
  let confirmAction: 'restart' | 'delete' | null = null
  let overwrite: FaceSet | null = null
  let photoIndex: Record<string, number> = {}
  let saveSequence = 0
  let importInput: HTMLInputElement
  let uploadInput: HTMLInputElement
  const modeLabels: Record<Mode, string> = { face: 'Face → name', name: 'Name → face', mixed: 'Mixed' }
  const message = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.'
  const person = (id: string) => active!.people.find(p => p.id === id)!
  const progressKey = (id: string) => `face-to-name:progress:${id}`
  function focusDialog(node: HTMLDivElement) {
    const previous = document.activeElement as HTMLElement | null
    node.querySelector<HTMLElement>('button')?.focus()
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { confirmAction = null; overwrite = null }
      if (event.key !== 'Tab') return
      const buttons = [...node.querySelectorAll<HTMLButtonElement>('button')]
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus() }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus() }
    }
    node.addEventListener('keydown', keydown)
    return { destroy() { node.removeEventListener('keydown', keydown); previous?.focus() } }
  }
  const hubHref = new URL('../', new URL(import.meta.env.BASE_URL, window.location.origin)).pathname
  $: errors = active ? setErrors(active) : []
  $: completeCount = active && progress ? completedPeople(active, progress, mode) : 0
  $: correctPerson = question && active ? person(question.personId) : null
  $: hasProgress = !!progress && Object.values(progress.records).some(record => record.face > 0 || record.name > 0 || record.missedFace || record.missedName)

  onMount(() => {
    void initialize()
  })

  async function initialize() {
    const id = new URLSearchParams(location.search).get('set')
    if (id !== null) {
      published = true
      try {
        if (!validId(id)) throw new Error('This set link is invalid. Ask the organizer for the full link.')
        const response = await fetch(`${import.meta.env.BASE_URL}sets/${encodeURIComponent(id)}.json`, { cache: 'no-cache' })
        if (!response.ok) throw new Error('This set is unavailable. It may not be published yet, or its link may have changed.')
        const text = await response.text()
        if (text.length > MAX_PACKAGE_BYTES) throw new Error('This set is too large to open.')
        const loaded = parseSet(JSON.parse(text))
        if (loaded.id !== id) throw new Error('This set does not match its link. Ask the organizer to republish it.')
        openGallery(loaded)
      } catch (e) { error = message(e) }
    } else {
      try { sets = await localSets() } catch (e) { error = message(e) }
    }
    loading = false
  }

  async function changed() {
    await tick()
    if (!active) return
    const snapshot = JSON.parse(JSON.stringify(active)) as FaceSet
    const sequence = ++saveSequence
    saveStatus = 'Saving…'
    sets = [...sets.filter(s => s.id !== snapshot.id), snapshot]
    try {
      await storeSet(snapshot)
      if (sequence === saveSequence) saveStatus = 'Saved on this browser'
    } catch (e) { if (sequence === saveSequence) saveStatus = message(e) }
  }

  function createSet() {
    active = newSet(); view = 'builder'; queue = []; error = ''; notice = ''; published = false
    void changed()
  }

  function editSet(set: FaceSet) {
    active = structuredClone(set); view = 'builder'; queue = []; error = ''; notice = ''; saveStatus = 'Saved on this browser'
  }

  function openGallery(set: FaceSet) {
    active = set; view = 'gallery'; error = ''; notice = ''; question = null; selected = null; photoIndex = {}
    let saved: unknown
    try {
      const raw = localStorage.getItem(progressKey(set.id))
      saved = raw ? JSON.parse(raw) : undefined
      const storedMode = localStorage.getItem(`face-to-name:mode:${set.id}`)
      if (storedMode === 'face' || storedMode === 'name' || storedMode === 'mixed') mode = storedMode
    } catch { notice = 'Saved progress could not be read. You can still practice here.' }
    progress = reconcileProgress(set, saved)
    persistProgress()
  }

  function persistProgress() {
    if (!active || !progress) return
    try {
      localStorage.setItem(progressKey(active.id), JSON.stringify(progress))
      localStorage.setItem(`face-to-name:mode:${active.id}`, mode)
    } catch { notice = 'Progress cannot be saved in this browser. Keep this page open to continue your session.' }
  }

  function chooseMode(value: Mode) { mode = value; persistProgress() }
  function continuePractice() {
    if (!active || !progress) return
    question = nextQuestion(active, progress, mode)
    selected = null
    view = question ? 'practice' : 'complete'
    void tick().then(() => document.getElementById('practice-heading')?.focus())
  }

  function answer(id: string) {
    if (selected || !progress || !question) return
    selected = id
    progress = answerQuestion(progress, question, id)
    persistProgress()
    void tick().then(() => document.getElementById('next-question')?.focus())
  }

  function restart() {
    if (!active || !progress) return
    // Starting fresh resets only the directions selected for this round.
    const records = Object.fromEntries(Object.entries(progress.records).map(([id, r]) => {
      const record = { ...r }
      for (const direction of directions(mode)) {
        record[direction] = 0
        record[direction === 'face' ? 'missedFace' : 'missedName'] = false
      }
      return [id, record]
    }))
    progress = { ...progress, records }
    confirmAction = null; persistProgress(); continuePractice()
  }

  async function importFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]; input.value = ''
    if (!file) return
    error = ''; notice = ''
    try {
      if (file.size > MAX_PACKAGE_BYTES) throw new Error('Choose a set file smaller than 50 MB.')
      const set = parseSet(JSON.parse(await file.text()), false)
      if (sets.some(s => s.id === set.id)) { overwrite = set; return }
      editSet(set); await changed()
    } catch (e) { error = message(e) }
  }

  async function uploadFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const files = [...(input.files ?? [])]; input.value = ''
    busy = true; error = ''; notice = ''
    const failures: string[] = []
    try {
      for (const file of files) {
        try {
          const photo = await preparePhoto(file)
          queue = [...queue, { id: crypto.randomUUID(), filename: file.name, photo, name: '', personId: '' }]
        } catch (e) { failures.push(message(e)) }
      }
      if (failures.length) error = failures.join(' ')
    } finally { busy = false }
  }

  function assignPhoto(item: Upload) {
    if (!active) return
    error = ''
    if (item.personId) {
      const target = active.people.find(p => p.id === item.personId)
      if (!target) { error = 'Choose a person to attach this photo to.'; return }
      if (target.photos.length >= 3) { error = `${target.name} already has three photos.`; return }
      target.photos = [...target.photos, item.photo]
    } else {
      const name = item.name.trim()
      if (!name) { error = 'Enter a preferred name for this photo.'; return }
      if (active.people.some(p => normalizeName(p.name) === normalizeName(name))) { error = `“${name}” is already in this set. Choose that person from “Attach to” or use a different name.`; return }
      active.people = [...active.people, { id: crypto.randomUUID(), name, photos: [item.photo] }]
    }
    active = { ...active }
    queue = queue.filter(q => q.id !== item.id)
    void changed()
  }

  function deletePhoto(id: string, index: number) {
    if (!active) return
    active.people = active.people.map(p => p.id === id ? { ...p, photos: p.photos.filter((_, i) => i !== index) } : p)
    void changed()
  }

  function deletePerson(id: string) {
    if (!active) return
    active.people = active.people.filter(p => p.id !== id)
    void changed()
  }

  function download(ready: boolean) {
    if (!active) return
    error = ''; notice = ''
    try {
      if (ready && queue.length) throw new Error('Assign or discard the pending photos before exporting.')
      const clean = parseSet(active, ready)
      const blob = new Blob([JSON.stringify(clean)], { type: 'application/json' })
      if (blob.size > MAX_PACKAGE_BYTES) throw new Error('This set exceeds 50 MB. Remove some photos before exporting.')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `${clean.id}${ready ? '' : '.backup'}.json`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notice = ready ? 'Set exported. Follow the publishing steps below to make its practice link available.' : 'Backup downloaded. Unassigned photos are not included.'
    } catch (e) { error = message(e) }
  }

  async function deleteLocal() {
    if (!active) return
    try {
      await removeSet(active.id)
      sets = sets.filter(s => s.id !== active!.id)
      active = null; view = 'home'; confirmAction = null; error = ''; notice = 'Local set removed.'
    } catch (e) { error = message(e); confirmAction = null }
  }

  async function copyLink() {
    if (!active) return
    try { await navigator.clipboard.writeText(location.href); notice = 'Practice link copied.' }
    catch { notice = 'Copy the address from your browser to share this set.' }
  }
</script>

<svelte:head><title>{active?.title ? `${active.title} · Face to Name` : 'Face to Name · Classroom Tools'}</title></svelte:head>

<header class="topbar">
  <a class="brand" href={import.meta.env.BASE_URL}><span class="brand-symbol" aria-hidden="true">F<span>n</span></span> Face to Name</a>
  <a class="back-link" href={hubHref}>Classroom Tools <span aria-hidden="true">↗</span></a>
</header>

<main>
  {#if error}<div class="alert error" role="alert">{error}<button class="text-button" on:click={() => error = ''} aria-label="Dismiss error">Dismiss</button></div>{/if}
  {#if notice}<div class="alert" role="status">{notice}</div>{/if}

  {#if loading}
    <section class="empty"><p class="eyebrow">FACE TO NAME</p><h1>Opening your set…</h1></section>
  {:else if published && !active}
    <section class="empty"><h1>We couldn’t open this set</h1><p>Check the link with the person who shared it.</p><a class="button secondary" href={import.meta.env.BASE_URL}>Back to Face to Name</a></section>
  {:else if view === 'home'}
    <section class="intro">
      <div><p class="eyebrow">A LITTLE PRACTICE. A FAMILIAR FACE.</p><h1>Make names<br />second nature.</h1><p class="lead">Learn the people on your team, one face at a time.</p></div>
      <div class="intro-note"><span class="note-number">01 / 02 / 03</span><p>Meet everyone.<br />Match faces and names.<br />Come back to the tricky ones.</p><span class="quiet">Your practice stays yours.</span></div>
    </section>
    <section class="organizer-start">
      <div><p class="eyebrow">SET BUILDER</p><h2>Start with your people.</h2><p>Add at least four people, with up to three photos each.</p></div>
      <div class="actions"><button class="primary" on:click={createSet}>Create a set <span aria-hidden="true">＋</span></button><button class="secondary" on:click={() => importInput.click()}>Import a set</button></div>
    </section>
    <input class="hidden" bind:this={importInput} type="file" accept=".json,application/json" on:change={importFile} aria-label="Import set file" />
    {#if sets.length}
      <section class="local-library"><div class="section-heading"><h2>Your local sets</h2><span class="quiet">Only on this browser</span></div><div class="set-grid">
        {#each sets as set}
          <article class="local-set"><div class="mini-photos">{#each set.people.slice(0, 3) as p}{#if p.photos[0]}<img src={p.photos[0]} alt="" />{/if}{/each}</div><h3>{set.title || 'Untitled set'}</h3><p>{set.people.length} people</p><div class="actions"><button class="secondary" on:click={() => editSet(set)}>Edit set</button>{#if !setErrors(set).length}<button class="text-button" on:click={() => openGallery(set)}>Browse & practice →</button>{/if}</div></article>
        {/each}
      </div></section>
    {/if}
    <p class="footnote">Here to practice? Open the set link your organizer shared. Published sets aren’t listed here.</p>

  {:else if view === 'builder' && active}
    <div class="section-heading"><button class="text-button" disabled={busy || queue.length > 0} on:click={() => { view = 'home'; error = ''; notice = '' }}>← Local sets</button><span class="save-status" role="status">{saveStatus}</span></div>
    <section class="builder-heading"><div><p class="eyebrow">SET BUILDER</p><h1>Your people,<br />by name.</h1></div><div class="builder-title"><label for="set-title">Set title</label><input id="set-title" maxlength="160" placeholder="e.g. Riverside Rugby" bind:value={active.title} on:input={changed} /><span class="quiet">{active.people.length} people · Minimum 4 to practice</span></div></section>
    <div class="upload-bar"><div><h2>Add your photos</h2><p>Upload several at once, then give each face a name.</p></div><button class="primary" disabled={busy} on:click={() => uploadInput.click()}>{busy ? 'Preparing photos…' : 'Upload photos'} <span aria-hidden="true">↑</span></button><input class="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" bind:this={uploadInput} on:change={uploadFiles} aria-label="Upload photos" /></div>

    {#if queue.length}
      <section class="pending"><div class="section-heading"><h2>Who’s in each photo?</h2><span class="quiet">{queue.length} to assign · Not saved until assigned</span></div><div class="assignment-grid">
        {#each queue as item (item.id)}
          <article class="assignment"><img src={item.photo} alt={`Unassigned photo: ${item.filename}`} /><div class="assignment-fields"><p class="filename">{item.filename}</p><label for={`assign-${item.id}`}>Attach to</label><select id={`assign-${item.id}`} bind:value={item.personId}><option value="">Someone new</option>{#each active.people as p}<option value={p.id} disabled={p.photos.length >= 3}>{p.name || 'Unnamed person'} ({p.photos.length}/3 photos)</option>{/each}</select>{#if !item.personId}<label for={`name-${item.id}`}>Preferred name</label><input id={`name-${item.id}`} maxlength="100" bind:value={item.name} placeholder="e.g. Jake M." on:keydown={event => { if (event.key === 'Enter') assignPhoto(item) }} />{/if}<div class="actions"><button class="primary" on:click={() => assignPhoto(item)}>Assign photo</button><button class="text-button" on:click={() => queue = queue.filter(q => q.id !== item.id)}>Discard</button></div></div></article>
        {/each}
      </div></section>
    {/if}

    {#if active.people.length}
      <section class="people-editor"><div class="section-heading"><h2>Everyone in this set</h2><span class="quiet">1–3 photos per person</span></div><div class="editor-grid">{#each active.people as p (p.id)}
        <article class="editor-person"><label for={`person-${p.id}`}>Preferred name</label><input id={`person-${p.id}`} maxlength="100" bind:value={p.name} on:input={changed} aria-invalid={active.people.some(other => other.id !== p.id && normalizeName(other.name) === normalizeName(p.name))} /><div class="editable-photos">{#each p.photos as photo, i}<div><img src={photo} alt={`${p.name || 'Person'}, photo ${i + 1}`} /><button class="remove-photo" aria-label={`Remove photo ${i + 1} of ${p.name}`} on:click={() => deletePhoto(p.id, i)}>×</button></div>{/each}</div><button class="text-button danger" on:click={() => deletePerson(p.id)}>Remove person</button></article>
      {/each}</div></section>
    {:else if !queue.length}
      <section class="empty builder-empty"><span class="empty-mark" aria-hidden="true">＋</span><h2>A set starts with four familiar faces.</h2><p>Your people will appear here after you assign their photos.</p></section>
    {/if}

    {#if errors.length}<ul class="validation" aria-label="Before you practice or publish">{#each errors as issue}<li>{issue}</li>{/each}</ul>{/if}
    <div class="builder-footer"><div class="actions"><button class="primary" disabled={errors.length > 0 || queue.length > 0 || busy} on:click={() => active && openGallery(active)}>Browse & practice →</button><button class="secondary" disabled={errors.length > 0 || queue.length > 0 || busy} on:click={() => download(true)}>Export for publishing</button><button class="text-button" on:click={() => download(false)}>Download backup</button></div><button class="text-button danger" disabled={busy} on:click={() => confirmAction = 'delete'}>Delete local set</button></div>
    <details class="publishing"><summary>How to publish this set</summary><p>Export your set, then run this command from the Classroom Tools project folder, replacing the example path with your downloaded file:</p><code>pnpm publish:face-set -- "C:\path\to\{active.id}.json"</code><p>Run <code>pnpm build:pages</code>, then publish the updated website using your usual GitHub Pages process. The command prints your set’s practice path. Reimport this set to edit it; exporting and publishing it again keeps the same link.</p><p>Published names and photos are public to anyone with the link. Local edits and backups do not update the website until you publish again.</p></details>

  {:else if view === 'gallery' && active && progress}
    <section class="gallery-heading"><div><p class="eyebrow">MEET EVERYONE</p><h1>{active.title}</h1><p class="lead">{active.people.length} people. Take a look, then put names to faces.</p></div>{#if published}<button class="secondary" on:click={copyLink}>Copy practice link ↗</button>{:else}<button class="secondary" on:click={() => active && editSet(active)}>Edit set</button>{/if}</section>
    <section class="practice-bar"><div><label for="practice-mode">Practice direction</label><select id="practice-mode" value={mode} on:change={event => chooseMode(event.currentTarget.value as Mode)}>{#each Object.entries(modeLabels) as [value, label]}<option {value}>{label}</option>{/each}</select></div><div class="round-summary"><strong>{completeCount} of {active.people.length} people ready</strong><span>Two correct answers{mode === 'mixed' ? ' in each direction' : ''} since the last mistake.</span></div><button class="primary" on:click={continuePractice}>{completeCount === active.people.length ? 'View completed round' : hasProgress ? 'Resume practice' : 'Start practice'} →</button></section>
    <div class="people-grid">{#each active.people as p, index}<article class="person-card"><div class="portrait"><img src={p.photos[photoIndex[p.id] ?? 0]} alt={p.name} />{#if p.photos.length > 1}<button class="photo-switch" on:click={() => photoIndex = { ...photoIndex, [p.id]: ((photoIndex[p.id] ?? 0) + 1) % p.photos.length }} aria-label={`Next photo of ${p.name}`}>{(photoIndex[p.id] ?? 0) + 1} / {p.photos.length} ↻</button>{/if}</div><div class="person-caption"><span class="person-number">{String(index + 1).padStart(2, '0')}</span><h2>{p.name}</h2></div></article>{/each}</div>
    <div class="gallery-footer"><p class="footnote">Progress stays on this browser. Nothing is reported to your organizer.</p>{#if hasProgress}<button class="text-button" on:click={() => confirmAction = 'restart'}>Start this mode fresh</button>{/if}</div>

  {:else if view === 'practice' && active && progress && question && correctPerson}
    <div class="section-heading"><button class="text-button" on:click={() => view = 'gallery'}>← Back to everyone</button><span class="quiet">{active.title}</span></div>
    <div class="practice-progress"><div><span>{modeLabels[mode]}</span><strong>{completeCount} / {active.people.length} people ready</strong></div><progress value={completeCount} max={active.people.length} aria-label="People ready"></progress></div>
    <section class="quiz" class:reverse={question.direction === 'name'}>
      <p class="eyebrow">{question.direction === 'face' ? 'FACE → NAME' : 'NAME → FACE'}</p><h1 id="practice-heading" tabindex="-1">{question.direction === 'face' ? 'What’s their name?' : `Which one is ${correctPerson.name}?`}</h1>
      {#if question.direction === 'face'}<div class="question-photo"><img src={question.photo} alt="Person to identify" /></div>{/if}
      <div class="answer-grid" class:photo-answers={question.direction === 'name'}>{#each question.choices as choice, index}<button class="answer" class:correct={selected !== null && choice.personId === question.personId} class:incorrect={selected === choice.personId && selected !== question.personId} disabled={selected !== null} on:click={() => answer(choice.personId)} aria-label={question.direction === 'face' ? person(choice.personId).name : `Photo ${index + 1}`}>
        {#if question.direction === 'name'}<img src={choice.photo} alt={`Option ${index + 1}`} />{/if}<span class="answer-label"><span class="option-number">{index + 1}</span>{question.direction === 'face' ? person(choice.personId).name : selected ? person(choice.personId).name : `Photo ${index + 1}`}{#if selected && choice.personId === question.personId}<span class="answer-icon" aria-label="Correct answer">✓</span>{:else if selected === choice.personId}<span class="answer-icon" aria-label="Incorrect answer">×</span>{/if}</span>
      </button>{/each}</div>
      {#if selected}<div class="feedback" class:try-again={selected !== question.personId} role="status"><div><strong>{selected === question.personId ? `That’s ${correctPerson.name}.` : `This is ${correctPerson.name}.`}</strong><p>{selected === question.personId ? (progress.records[question.personId][question.direction] === 2 ? 'Two correct in this direction. Nicely done.' : 'One correct. You’ll see this person again.') : 'Take a moment with the correct pairing. We’ll bring this person back.'}</p></div><button id="next-question" class="primary" on:click={continuePractice}>{completeCount === active.people.length ? 'Finish round' : 'Continue'} →</button></div>{:else}<p class="quiz-hint">Choose one of the four options. Take your time.</p>{/if}
    </section>

  {:else if view === 'complete' && active}
    <section class="completion"><span class="completion-check" aria-hidden="true">✓</span><p class="eyebrow">EVERY FACE, A FAMILIAR NAME</p><h1>You know your people.</h1><p class="lead">You answered correctly for all {active.people.length} people in {active.title}.</p><p>Two correct answers{mode === 'mixed' ? ' in both directions' : ` in ${modeLabels[mode].toLowerCase()} mode`} since each person’s last mistake.</p><div class="actions"><button class="primary" on:click={() => view = 'gallery'}>Back to everyone</button><button class="secondary" on:click={() => confirmAction = 'restart'}>Practice again</button></div><p class="footnote">Your progress is saved on this browser.</p></section>
  {/if}

  {#if confirmAction || overwrite}
    <div class="modal-backdrop"><div class="confirm-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title" tabindex="-1" use:focusDialog><h2 id="confirm-title">{overwrite ? 'Replace the local copy?' : confirmAction === 'delete' ? 'Delete this local set?' : 'Start this mode fresh?'}</h2><p>{overwrite ? 'This imported file has the same set ID. It will replace your local names and photos.' : confirmAction === 'delete' ? 'This removes the set from this browser. Your exported files and published set stay available.' : 'This clears the practice counts for the selected direction or directions.'}</p><div class="actions"><button class="secondary" on:click={() => { confirmAction = null; overwrite = null }}>Cancel</button><button class="primary" on:click={() => { if (overwrite) { editSet(overwrite); overwrite = null; void changed() } else if (confirmAction === 'delete') void deleteLocal(); else restart() }}>{overwrite ? 'Replace local copy' : confirmAction === 'delete' ? 'Delete local set' : 'Start fresh'}</button></div></div></div>
  {/if}
</main>

<footer class="site-footer"><span>FACE TO NAME</span><span>A Classroom Tools app</span></footer>
